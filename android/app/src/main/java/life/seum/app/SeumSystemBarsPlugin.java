package life.seum.app;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SeumSystemBars")
public class SeumSystemBarsPlugin extends Plugin {
    @PluginMethod
    public void apply(PluginCall call) {
        String color = call.getString("color");
        Boolean dark = call.getBoolean("dark");
        if (color == null || !color.matches("^#[0-9a-fA-F]{6}$") || dark == null) {
            call.reject("A hex theme color and dark flag are required.");
            return;
        }
        int background = Color.parseColor(color);
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            // Edge-to-edge bars are transparent on recent Android versions.
            getActivity().findViewById(android.R.id.content).setBackgroundColor(background);
            window.setStatusBarColor(background);
            window.setNavigationBarColor(background);
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(!dark);
            controller.setAppearanceLightNavigationBars(!dark);
            call.resolve();
        });
    }
}
