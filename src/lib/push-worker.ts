import { createClient } from '@/lib/supabase';
import { sendNativePush, type PushResult } from '@/lib/push-senders';

interface PushJob { id: string; notification_id: string; device_id: string; device_version: string; lease_id: string }

export async function dispatchPushJobs() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('claim_push_jobs', { p_limit: 5 });
  if (error) throw new Error(`Push queue claim failed: ${error.code}`);
  const jobs: PushJob[] = data || [];
  const results = await Promise.all(jobs.map(async (job) => {
    let result: PushResult;
    try {
      const [deviceResult, notificationResult] = await Promise.all([
        supabase.from('push_devices').select('*').eq('id', job.device_id).maybeSingle(),
        supabase.from('notifications')
          .select('id, recipient_id, department_id, title, is_read, post:posts(department_id, author_id, visibility, village_id), recipient:users!notifications_recipient_id_fkey(is_approved, department_id, role, village_id)')
          .eq('id', job.notification_id).maybeSingle(),
      ]);
      if (deviceResult.error || notificationResult.error) throw new Error('Push queue context lookup failed');
      const device = deviceResult.data;
      const notification = notificationResult.data;
      // PostgREST relation cardinality can vary with generated schema types.
      const recipient = Array.isArray(notification?.recipient) ? notification.recipient[0] : notification?.recipient;
      const post = Array.isArray(notification?.post) ? notification.post[0] : notification?.post;
      const canView = !post || (post.department_id === notification?.department_id &&
        (post.author_id === notification?.recipient_id || recipient?.role === 'minister' ||
          post.visibility === 'all' || (post.visibility === 'village' &&
            (recipient?.role === 'village_leader' || (post.village_id && post.village_id === recipient?.village_id)))));
      if (!device || !notification || !device.enabled || device.token_version !== job.device_version ||
          device.user_id !== notification.recipient_id || notification.is_read ||
          new Date(device.session_expires_at).getTime() <= Date.now() ||
          !recipient?.is_approved || recipient.department_id !== notification.department_id || !canView) {
        result = { outcome: 'cancelled', error: 'Device, recipient or notification no longer eligible' };
      } else {
        result = await sendNativePush(device, {
          id: notification.id, recipientId: notification.recipient_id, title: notification.title,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push delivery failed';
      console.error('Push delivery failed:', job.id, message);
      result = { outcome: 'retry', error: message };
    }
    const { data: finished, error: finishError } = await supabase.rpc('finish_push_job', {
      p_id: job.id, p_lease_id: job.lease_id, p_outcome: result.outcome, p_error: result.error || null,
    });
    if (finishError || finished !== true) throw new Error('Push queue result could not be committed; lease recovery required');
    return { id: job.id, ...result };
  }));
  return { claimed: jobs.length, results };
}
