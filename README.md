# SEUM 프로젝트 ReadMe

## 프로젝트 개요

SEUM은 교회 내 다양한 역할(담임목사, 부서장, 리더, 일반 성도 등)에 따라 접근 권한이 분리된 통합 관리/소통 플랫폼입니다. 본 문서는 주요 기능별 접근 권한과 인증 방식, 그리고 전체적인 사용 프로세스를 안내합니다.

---

## 1. 로그인 및 교회/담임목사 인증

- **교회/담임목사 인증 시 입력 예시**
  - 교회명: "은혜교회"
  - 담임목사명: "홍길동" 또는 "홍길동목사" (둘 다 허용, 예시로 표기)
    - 예시: `홍길동` 또는 `홍길동목사`
  - 이름만 입력해도 되고, "목사"를 붙여도 인증 가능하도록 설계됨

---

### 회원 승인 후 첫 소속 선택

- 새로 가입한 회원은 승인 후 첫 로그인에서 마을과 소그룹을 모두 선택해야 서비스를 이용할 수 있습니다. 선택 전에는 다른 화면이나 서비스 API에 접근할 수 없습니다.
- 소속 부서의 활성 연도에 등록된 마을과 해당 마을의 소그룹만 표시합니다. 소그룹 이름과 목자 이름은 기존 회원 관리 폼과 동일하게 표시합니다.
- 기존 회원과 관리자가 마을·소그룹을 모두 배정한 회원은 기존처럼 바로 이용합니다. 선택 완료 후 재로그인 시 다시 선택하지 않습니다.
- 소속을 잘못 선택했거나 선택 가능한 소속이 없으면 마을장이나 사역자에게 문의하도록 안내합니다. 이후 소속 수정은 기존 관리자 회원 관리에서 처리합니다.
- **배포 전 DB 적용:** `supabase/migrations/add_group_selection_required.sql`을 Supabase SQL Editor에서 먼저 실행해야 합니다. 기존 회원은 필수 선택 대상에 포함하지 않으며, 이후 회원가입부터 적용됩니다.
- 관련 회귀 테스트: `node --test tests/group-selection.test.cjs` (필수 선택 검증, 저장·세션 갱신, 관리자 배정 보존, 직접 접근 차단).


## 2. 공지 게시판(Notice) 권한

- **작성:** 사역자(목사/강도사/전도사/간사), 국장단(행정국장 등)
  - 실제 코드: `canWritePost(role, 'notice', isBureau)`
  - 사역자(`minister`) 또는 국장단(`isBureauLeader`/`isBureauMember`)만 작성 가능
- **수정/삭제:**
  - 작성자 본인, 사역자만 가능 (`canEditPost`, `canDeletePost`)
- **읽기:** 전체 공개

---

## 3. 소그룹(셀) 탭별 권한 및 노출

- **기도제목 탭**
  - 작성/수정: 본인, 목자(셀장, cell_leader), 사역자
  - 읽기: 소그룹원 전체(목원, 목자, 부목자)
  - 목자는 소그룹 전체 기도제목 수정 가능, 목원은 본인 및 소그룹원 기도제목 작성/수정 가능

- **마을 탭**
  - **노출:** 목자(cell_leader) 이상(=목자, 마을장, 사역자)에게만 노출
    - 일반 목원(cell_member)은 마을 탭 자체가 보이지 않음
  - **작성/수정/삭제:** 마을장(village_leader), 사역자(minister)
  - **읽기:** 마을장, 사역자만(실제 노출 기준)

- **경건생활(출석) 탭**
  - 노출: 셀장(cell_leader), 마을장(village_leader), 사역자(minister), 본인
  - 작성: 본인
  - 읽기: 셀장, 마을장, 사역자, 본인


- **나무 탭**
  - **셀원(cell_member), 셀장(cell_leader):**
    - 본인 소그룹(셀) 기준의 성장 나무(출석/경건생활 집계)만 노출
    - 각 셀별로 월별 성장률, 출석률 등 개인/셀 단위로 확인
  - **마을장(village_leader), 사역자(minister):**
    - 전체 마을/교회 소그룹의 성장 나무 현황(집계/통계)만 노출
    - 개별 셀원/셀장처럼 자신의 셀 나무를 직접 보는 기능은 없음
  - (작성/수정은 시스템 자동 처리, 직접 입력 불가)

- **나눔/모임/중보기도 게시판**
  - **작성:** 전체(목원 포함)
  - **수정:** 작성자 본인, 사역자
  - **삭제:** 사역자, 마을장, 작성자 본인
  - **카테고리 관리:** 사역자, 국장단만 가능 (Admin)

---

## 4. 관리자(Admin) 페이지 접근 및 권한

- **접근 가능 대상:**
  - 사역자(minister)
  - 마을장(village_leader)
  - 국장단(행정국장 등, isBureau)
  - 시스템 관리자

- **직급별 노출 권한/페이지**
  - **사역자(목사/강도사/전도사/간사):**
    - 전체 교회/부서/마을/셀/성도 관리
    - 공지/게시판/카테고리/조직 관리
    - 통계/리포트
    - 직급/명칭 변경
  - **국장단:**
    - 공지 작성, 카테고리 관리, 일부 조직 관리
  - **마을장:**
    - 본인 마을/셀/성도 관리
    - 마을원 이동/배정
    - 조직 관리(마을 한정)
  - **일반 성도(목원):** 관리자 페이지 접근 불가

---

---

## 3. 소그룹(셀) 탭별 권한 및 노출

- **기도제목 탭**
  - 작성/수정/삭제: 리더, 부리더
  - 읽기: 소그룹원 전체

- **마을 탭**
  - 작성/수정/삭제: 마을장
  - 읽기: 해당 마을 소속원 전체

- **경건생활 탭**
  - 작성: 본인(개인)
  - 읽기: 리더, 부리더, 본인

- **나무 탭**
  - 읽기: 소그룹원 전체
  - (작성/수정은 시스템 자동 처리)

- **나눔/모임/기도제목**
  - 권한 동일: 소그룹원 전체(작성/수정/삭제/읽기)

---

## 4. 관리자 페이지 접근 및 권한

- **접근 가능 대상:**
  - 담임목사
  - 부서장(교역자)
  - 시스템 관리자

- **직급별 노출 권한/페이지**
  - **담임목사**
    - 전체 교회 관리
    - 부서/마을/셀/성도 관리
    - 공지/게시판 관리
    - 통계/리포트
  - **부서장(교역자)**
    - 담당 부서/마을/셀/성도 관리
    - 부서별 공지/게시판 관리
    - 통계(부서 한정)
  - **시스템 관리자**
    - 전체 시스템 설정
    - 모든 데이터 접근 및 관리

- **일반 성도:** 관리자 페이지 접근 불가

---


## 5. 프로젝트 구조

```
src/
  app/
    login, register: 인증
    boards: 공지/나눔/모임/중보기도 게시판
    small-group, prayer, village: 소그룹/기도제목/마을
    admin: 관리자 페이지
  components/
    admin, attendance, auth, board, layout, prayer, ui 등
  lib/
    permissions.ts: 권한 분기/체크
    auth.ts: 인증
    constants.ts: 역할/직급/권한 상수
    types.ts: 타입 정의
```

---

## 6. 개발 및 실행 방법

1. 의존성 설치
   ```bash
   npm install
   ```
2. 개발 서버 실행
   ```bash
   npm run dev
   ```
3. 환경 변수 및 DB 설정은 `.env`와 `supabase/` 참고

---

## 7. 기타 참고 사항

- TailwindCSS, Next.js 기반
- Supabase 사용
- 권한 및 인증 로직은 `src/lib/permissions.ts`, `src/lib/auth.ts` 참고

---

## 8. PWA 설정 및 확인

- [Manifest](src/app/manifest.ts), [iOS 메타 태그 및 viewport](src/app/layout.tsx), 192/512 아이콘과 [Apple Touch Icon](src/app/apple-icon.tsx)은 기존 설정을 유지합니다.
- [Service Worker](public/sw.js)는 페이지 이동에 네트워크 우선 전략을 사용하고, 네트워크 실패 시 [오프라인 안내](public/offline.html)를 표시합니다. API와 외부 origin 요청은 캐싱하지 않습니다. 오프라인 조회·작성 기능은 제공하지 않습니다.
- [등록 컴포넌트](src/components/service-worker-registrar.tsx)의 등록 실패는 브라우저 콘솔에 `Service Worker registration failed:`와 원본 오류로 기록됩니다.
- Manifest·아이콘·정적 파일은 Cache-first입니다. 사전 캐싱 리소스를 변경할 때는 `public/sw.js`의 `CACHE_NAME` 버전을 함께 올려 새 설치에서 다시 받도록 합니다. 아이콘 이미지를 변경하면 HTTP 캐시와 설치된 앱 아이콘의 갱신도 확인해야 합니다.
- 회귀 테스트: `node --test tests/pwa.test.cjs tests/group-selection.test.cjs`. 이 테스트는 코드 수준의 등록·캐싱·오프라인 분기 및 기존 소속 선택 흐름을 검사하며, 실기기 설치나 네이티브 Push 수신을 검증하지 않습니다.
- 실기기 확인: Android Chrome/iPhone Safari에서 홈 화면 추가, standalone 실행, 아이콘 크롭(maskable 안전 영역 포함), 로그인 유지, 재실행, 로그아웃 및 계정 전환을 확인합니다. SW 설치 완료 후 네트워크를 차단해 오프라인 안내와 연결 복구도 확인합니다.
- Capacitor 앱 전환 시 기존 SSR·API·쿠키 인증을 강제로 정적 export하지 않습니다. `server.url`은 Capacitor 공식 문서상 live reload용이므로, 원격 웹 로딩 검증과 스토어 출시 구성을 구분해야 합니다.

---

## 9. Capacitor 네이티브 검증용 프로젝트

### 현재 범위

- 기존 Next.js SSR·API·JWT 쿠키 인증과 웹 UI를 유지하고, [Capacitor 설정](capacitor.config.ts)의 `https://seum-nu.vercel.app`를 WebView에서 로드합니다. 추가 `allowNavigation` 도메인과 HTTP/mixed content는 허용하지 않습니다.
- 앱 이름은 `세움`, Android Application ID/iOS Bundle ID는 `life.seum.app`, 초기 버전은 `0.1.0`, 빌드 번호는 `1`입니다.
- Capacitor core/CLI/Android/iOS는 `7.6.9`로 통일했습니다. CLI는 Node 20 이상을 요구합니다. 기존 Next.js 린트 의존성까지 고려하면 Node 20.19 이상을 권장합니다. Capacitor 최신 major 전환과 배포 시점의 SDK 요구사항 확인은 출시 구성 확정 시 수행합니다.
- [Android 프로젝트](android/)와 [iOS SPM 프로젝트](ios/)는 생성되어 있습니다. 새로 `cap add`를 실행하지 말고 설치 후 `npm run mobile:sync`로 복사된 설정·웹 자산을 갱신합니다.
- [로컬 웹 폴더](mobile-web/)는 Capacitor 동기화를 위한 안내 파일입니다. Next.js 빌드 결과나 오프라인 앱 번들이 아닙니다.
- Android Release APK/AAB와 iOS Release/Archive는 네이티브 빌드 가드로 차단합니다. 원격 로딩 검증 구성을 출시하지 않도록 하는 의도적인 제한입니다.
- 앱 아이콘은 기존 웹 브랜드 색상(`#3d6b48` → `#4a7d57` → `#5a8f65`)의 초록색 그라데이션과 흰색 `세움` 글자를 사용합니다. Android 일반·원형·적응형 아이콘과 iOS 1024 아이콘을 적용했습니다. 원본은 [브랜드 아이콘](assets/native/seum-icon.png)이며, Windows의 맑은 고딕 글꼴로 `npm run mobile:icons`를 실행하면 재생성할 수 있습니다. PNG 결과물을 저장소에서 관리하므로 다른 OS에서 매번 재생성할 필요는 없습니다.
- Splash의 별도 브랜드 디자인은 남아 있습니다. 네이티브 Push 플러그인·토큰 API·발송 큐·알림 클릭 이동은 구현되어 있으며, 아래 Push 운영 적용 절차를 완료해야 실제 서버와 연결됩니다.

### Android Debug 실행

Windows에서는 Android Studio 화면 조작 없이 프로젝트 루트에서 다음 명령으로 동기화·Debug 빌드·APK 복사를 실행할 수 있습니다.

```powershell
npm run mobile:android:debug
```

결과: `mobile-artifacts/android/seum-debug.apk`. 이 폴더는 Git에서 제외됩니다. 현재 Capacitor URL을 매번 동기화한 뒤 빌드하므로, 주소를 수정한 뒤에는 이 명령을 다시 실행합니다. APK를 휴대폰에 복사해 열고, 해당 파일 앱/브라우저의 “알 수 없는 앱 설치”를 허용하면 직접 설치할 수 있습니다. Debug APK는 스토어 제출용이 아닙니다.

USB 디버깅을 켠 휴대폰을 연결하고 휴대폰의 PC 연결 승인 창을 허용한 뒤:

```powershell
npm run mobile:android:install
```

기기 확인 후 동기화·빌드·설치·앱 실행을 진행합니다. 기기가 없거나 미승인/오프라인이면 설치하지 않고 오류를 표시합니다. 기기가 여러 대라면 `npm run mobile:android:install -- --serial DEVICE_ID`로 명시합니다. 서명이 다른 기존 앱이 있으면 설치가 실패할 수 있으며, 자동으로 삭제하지 않습니다.

이 도우미는 Windows용이며 `JAVA_HOME`/`ANDROID_HOME`을 우선 확인하고, 없으면 일반적인 Android Studio JDK·사용자 SDK 위치를 탐색합니다. 변경은 자식 빌드 프로세스에만 적용합니다.

Android Studio로 실행하는 방법:

1. `npm ci` 후 `npm run mobile:sync`를 실행합니다.
2. `npm run mobile:open:android`로 Android Studio에서 프로젝트를 엽니다.
3. Gradle JDK 21, Android SDK Platform 35 및 프로젝트에서 요구하는 Build Tools를 준비합니다. SDK 경로는 로컬 Android Studio 설정 또는 커밋하지 않는 `android/local.properties`로 지정합니다.
4. Debug variant로 연결된 기기/에뮬레이터에서 실행합니다. 실제 기기는 USB 디버깅과 연결 승인이 필요합니다.
5. CLI에서 빌드하려면 JDK/SDK 환경을 설정한 뒤 Android 폴더에서 Gradle Wrapper의 `assembleDebug`를 실행합니다.

Windows PowerShell 예시:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Set-Location android
.\gradlew.bat --no-daemon assembleDebug
```

Debug APK 경로: `android/app/build/outputs/apk/debug/app-debug.apk`.

### 파일 종류와 스토어 등록의 차이

| 파일 | 용도 | 현재 상태 |
|---|---|---|
| Debug APK | Android 휴대폰/에뮬레이터 직접 테스트 | 생성 가능 |
| Release APK | Android 배포용 설치 파일 | 검증용 출시 차단 유지, 배포 서명 미설정 |
| AAB | Google Play 업로드용 묶음. 휴대폰에 직접 설치하는 APK가 아님 | 출시 차단 유지, 업로드 키 서명·Play Console 준비 필요 |
| iOS `.app` | Xcode의 앱 빌드 결과. 시뮬레이터용과 실기기용은 서로 다름 | macOS/Xcode 빌드 필요 |
| iOS Archive / `.ipa` | TestFlight·App Store 제출 흐름 | 출시 차단 유지, Apple 개발자 팀·서명·App Store Connect 준비 필요 |

Capacitor는 Android/iOS 네이티브 프로젝트를 연결하는 도구이며, 스토어 계정이나 인증서를 자동 생성하거나 파일을 자동 등록하지 않습니다. iPhone 테스트는 macOS의 Xcode로 개발 서명 후 실행하거나, 출시 준비 후 TestFlight로 배포합니다. Windows에서 `.app` 파일을 만들어 iPhone에 복사하는 방식은 지원하지 않습니다.

다음 출시 단계는 앱 출시 구성 확정, Push 실제 연동, 브랜드 아이콘/Splash, Android 업로드 키 보관과 환경변수 기반 서명, iOS 개발 팀·인증서·프로비저닝, 개인정보/권한 안내와 스토어 자료 준비입니다. 테스트용 파일 생성과 실제 스토어 출시 가능 상태를 구분합니다.

### Play Protect 및 설치 실패 진단

- “알 수 없는 앱 설치” 권한, Play Protect 검사, Android 개발자 신원/패키지 등록, APK 업데이트 서명 일치는 별개의 조건입니다. 앱 이름·패키지 등록·인증서 지문 등록만으로 모든 설치 차단이 해제되지는 않습니다.
- Debug APK는 로컬 Android Debug 인증서로 서명합니다. Google Play 배포용 앱 서명 키와 AAB 업로드 키와는 다를 수 있습니다. 키를 새로 만들거나 등록된 키를 삭제하기 전에 각 인증서의 용도와 SHA-256 지문을 확인해야 합니다.
- 스크린샷의 일반적인 “앱이 설치되지 않음”만으로 원인을 확정할 수 없습니다. USB 디버깅을 승인하고 `npm run mobile:android:install`을 실행하면 실패 시 ADB의 `INSTALL_FAILED_...` 원문을 확인할 수 있습니다. USB 설치도 모든 기기 정책을 우회하거나 성공을 보장하지는 않습니다.
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`은 같은 패키지의 기존 앱과 서명이 다른 경우입니다. 기존 데이터를 보존해야 하므로 도우미는 앱을 자동 삭제하지 않습니다. `INSTALL_FAILED_VERSION_DOWNGRADE`는 빌드 번호, `INSTALL_FAILED_USER_RESTRICTED`는 사용자/관리자·기기 정책을 확인합니다.
- Play Protect를 끄는 것을 기본 해결책으로 삼지 않습니다. 실제 정책 차단이면 해당 안내를 따라 확인합니다. 공개 배포 전에는 개발자 인증·출시 서명·Play 내부 테스트 트랙을 준비합니다. 앱/소스/개인키를 외부 검사 서비스에 자동 업로드하지 않습니다.
- [Play Protect 안내](https://support.google.com/googleplay/answer/2812853?hl=ko), [Play 앱 서명 안내](https://support.google.com/googleplay/android-developer/answer/9842756?hl=ko), [Android 개발자 인증 안내](https://developer.android.com/developer-verification)를 참고합니다. Console의 실제 경고 문구와 키 유형을 확인한 뒤 계정/앱 상태를 진단해야 합니다.

### iOS Debug 실행

1. macOS에서 `npm ci`와 `npm run mobile:sync`를 실행합니다.
2. `npm run mobile:open:ios`로 `ios/App/App.xcodeproj`를 엽니다. CocoaPods가 아닌 Swift Package Manager 구성이며, Capacitor Swift 패키지를 정확히 `7.6.9`로 참조합니다.
3. Xcode에서 Swift 패키지를 resolve하고 Debug 설정을 사용합니다. Capacitor 7 기준 Xcode 16 이상이 필요하며, iOS 최소 버전은 14입니다.
4. 실제 iPhone 실행에는 Signing & Capabilities에서 개발 팀을 지정하고 기기 등록/신뢰 설정을 완료해야 합니다. 개발 팀·인증서는 저장소에 임의로 설정하지 않습니다.
5. Windows에서는 Xcode 컴파일·실기기 실행·Archive를 검증할 수 없습니다.

### 검증 및 알려진 사항

- 코드 회귀 검사: `node --test tests/pwa.test.cjs tests/native-preview.test.cjs tests/native-icons.test.cjs tests/android-preview.test.cjs tests/group-selection.test.cjs`.
- 네이티브 설정 테스트는 URL·ID·버전·SPM 참조·배포 가드 연결을 검사합니다. Xcode 실행이나 WebView 기능 검증을 대신하지 않습니다.
- 2026-10-05 로컬 검증: Android `assembleDebug` 성공, 생성된 APK의 ID `life.seum.app`·버전 `0.1.0`·빌드 번호 `1` 확인, `bundleRelease`의 배포 가드 차단 확인, 회귀 테스트 22개 통과, 웹 린트/TypeScript 검사 통과(기존 린트 경고 2개 유지). iOS 가드는 POSIX shell로 Debug/Release/Archive 분기를 실행해 검사했으며 Xcode 컴파일은 하지 않았습니다.
- 첫 Android 빌드는 SDK Platform 35가 없어 Gradle이 기존 승인된 라이선스로 설치했습니다. SDK 저장소 연결 시간 초과가 한 번 발생했지만 다운로드·빌드가 완료됐습니다. 글로벌 JAVA_HOME이나 SDK 환경변수는 변경하지 않고 빌드 프로세스 안에서만 지정했습니다.
- 실제 앱에서 로그인·가입·최초 소속 선택·로그아웃·계정 전환·재실행·세션 유지·이미지 업로드·외부 링크·뒤로가기·키보드·Safe Area를 확인해야 합니다.
- 외부 링크가 자동으로 앱 내부에 열릴 것으로 가정하지 않습니다. 카카오 앱 연동·공유·Universal Links/App Links는 별도 검증/구현 대상입니다.
- 최초 `cap add ios --packagemanager SPM`에서 CLI가 생성한 SPM 프로젝트를 CocoaPods로 처리해 없는 Podfile 오류가 발생했습니다. 별도 CLI 실행의 `npm run mobile:sync`에서 SPM을 정상 인식해 해결했습니다. 의존성 내부 코드는 변경하지 않았습니다.
- 설치 시 기존 린트 의존성 `eslint-visitor-keys`의 Node 버전 경고가 나타났습니다. 해당 의존성은 이전 lockfile에도 존재하며, 기존 Next.js 및 TypeScript ESLint 버전은 변경하지 않았습니다. 호환 Node 버전에서 설치하는 것을 권장합니다.
- 설치 감사에서 보고되는 취약점은 별도 점검 대상입니다. 웹서비스의 호환성을 위해 `npm audit fix --force`나 Next.js major 업그레이드를 자동 수행하지 않습니다.
- Release/Archive 가드는 출시 방식·Push·서명·스토어 요구사항을 확정한 후 의도적으로 교체해야 합니다. 현재 상태는 스토어 제출 가능한 앱이 아닙니다.

---

## 10. 게시글 공감 응답 개선

- [공감 UI](src/components/board/reaction-bar.tsx)는 서버 응답을 기다리지 않고 선택 상태·개수를 먼저 표시합니다. 저장 중 표시는 실제 API 완료까지 유지하며, 같은 이모티콘은 중복 요청을 막고 다른 이모티콘은 독립적으로 저장합니다.
- 성공 후 게시글·이미지·댓글을 포함한 `router.refresh()`를 실행하지 않습니다. 다른 사용자 반응은 이후 상세 화면 진입/서버 갱신 시 반영되며 실시간 구독은 추가하지 않았습니다. 댓글 수정 등으로 서버 초기 데이터가 갱신되면 공감 상태도 동기화하되 저장 중인 선택은 보존합니다.
- HTTP 오류·네트워크 오류·인증 만료로 HTML 응답이 오는 경우 원래 상태를 복구하고 화면과 콘솔에 오류를 표시합니다.
- [공감 API](src/app/api/posts/[id]/reactions/route.ts)는 입력을 검증하고 삭제 실패를 성공으로 반환하지 않습니다. 기존 중복 반응 처리와 작성자 알림을 유지합니다. 공감 저장 후 알림 오류는 저장 실패로 오인하지 않도록 별도 서버 로그에 기록합니다.
- 테스트: `node --test tests/reactions.test.cjs`. 모의 네트워크 응답을 보류한 상태에서 100ms 이내 로컬 상태 갱신, 전체 재조회 없음, 빠른 연속 클릭, 서로 다른 이모티콘의 동시 저장·롤백, 서버 데이터 동기화, API 오류·알림 보존을 검사합니다. 이 수치는 실제 휴대폰 프레임 시간이나 운영 Supabase 지연의 측정값은 아닙니다.
- 기존 DB 인덱스 정의에는 게시글별 공감 조회 인덱스와 `(post_id, user_id, emoji)` 고유 제약이 있습니다. 운영 DB 적용 상태나 리전·부하를 확인한 것은 아니며, 전역 타임아웃/재시도 정책을 임의로 바꾸지 않습니다.
- 변경은 웹 배포 후 원격 로딩 앱에도 적용됩니다. 이 작업만을 위해 APK를 다시 설치할 필요는 없습니다. 서버 반영 전에는 휴대폰에 기존 동작이 남아 있습니다.

## 11. Supabase를 유지하는 모바일 Push 연결

Firebase는 DB·로그인을 대체하지 않습니다. Android의 FCM 전송용으로 사용하며, 사용자·게시글·기존 알림·기기 토큰·발송 기록은 Supabase에서 관리할 수 있습니다. Play Console의 패키지/서명 등록과 Firebase 앱 등록은 별개입니다.

### Firebase에서 먼저 준비할 것

1. Firebase Console에서 SEUM용 프로젝트를 생성하거나 기존 프로젝트를 선택합니다. Push만을 위해 Firestore나 Firebase Auth를 활성화할 필요는 없습니다.
2. Android 앱 추가에서 패키지 이름을 정확히 `life.seum.app`으로 입력합니다. 단순 FCM 등록 자체에 로그인용 SHA 인증서 지문을 필수로 추가할 필요는 없습니다.
3. 해당 앱의 `google-services.json`을 다운로드해 `android/app/google-services.json`에 둡니다. 저장소에서 제외되어 있으며, 앱 설치/동기화만으로 Console 설정이 자동 생성되지는 않습니다.
4. 프로젝트의 FCM HTTP v1 API 활성 상태와 발송 서버 권한을 확인합니다. 서버용 서비스 계정 개인키는 앱·`NEXT_PUBLIC_` 변수·Git·채팅에 넣지 않습니다. 구현 시 서버 비밀 설정으로 연결합니다.
5. iOS도 같은 Firebase 프로젝트에 Bundle ID `life.seum.app`으로 추가할 수 있습니다. FCM 통합 방식으로 구현할 경우 `GoogleService-Info.plist`와 Apple APNs 인증 키/팀 ID/키 ID 연결, Xcode Push capability와 개발 팀 서명이 필요합니다. 기본 Capacitor Push 플러그인의 iOS 토큰은 APNs 토큰이므로 Android FCM 토큰과 혼동하면 안 됩니다.

### 구현된 위치

| 역할 | 파일/경로 |
|---|---|
| 네이티브 권한·등록·수신·클릭·내 정보 설정 | [NativePushProvider](src/components/notifications/native-push-provider.tsx) |
| 설치 ID·토큰 등록 직렬화·로그아웃 연결 | [native-push](src/lib/native-push.ts) |
| 사용자별 기기 등록·해제 | [POST/DELETE /api/push/devices](src/app/api/push/devices/route.ts) |
| 본인에게 테스트 알림 생성 | [POST /api/push/test](src/app/api/push/test/route.ts) |
| 수신자·부서·게시글 권한 확인 후 상세 이동 | [GET /api/push/notifications/:id](src/app/api/push/notifications/[id]/route.ts) |
| FCM HTTP v1·APNs HTTP/2 발송 | [push-senders](src/lib/push-senders.ts) |
| 작업 선점·결과 저장 | [push-worker](src/lib/push-worker.ts) |
| 별도 비밀 인증을 사용하는 발송 작업자 | [POST/GET /api/push/dispatch](src/app/api/push/dispatch/route.ts) |
| 기기·큐·트리거·RPC | [add_native_push.sql](supabase/migrations/add_native_push.sql) |
| 선택적 Supabase 매분 실행 스케줄 | [configure_native_push_dispatch.sql](supabase/migrations/configure_native_push_dispatch.sql) |

- `@capacitor/push-notifications@7.0.7`과 `@capacitor/preferences@7.0.4`를 사용합니다. Android는 FCM, iOS는 APNs 토큰을 분리 저장·발송합니다. iOS에 Firebase Messaging을 추가한 구성이 아니므로 iOS FCM 토큰으로 간주하지 않습니다.
- 일반 브라우저에서는 네이티브 권한·토큰 코드를 실행하지 않습니다. 플러그인이 없는 이전 APK에는 앱 업데이트 안내를 표시합니다.
- 앱 내 정보에서 **알림 권한 요청 / 등록**, **이 기기 알림 끄기**, **테스트 알림 보내기**를 사용할 수 있습니다. 최초 등록은 사용자 선택 후 진행합니다. 권한이 이미 허용되고 등록을 선택한 기기는 재실행/복귀 때 갱신합니다.
- 기존 웹 알림은 유지됩니다. `notifications` INSERT 트리거가 당시 활성 기기에만 `push_jobs`를 생성합니다. 등록 전 과거 알림을 소급 Push로 발송하지 않습니다. 사역자 공지는 기존처럼 새 글의 “모두에게 알림” 옵션을 선택해야 합니다.
- 토큰 교체·계정 전환·재설치는 등록 RPC에서 처리하고, 큐는 기기 세대·소유자·승인·세션 만료·읽음·게시글 권한을 확인합니다. 로그아웃은 진행 중 등록 요청을 기다린 뒤 현재 기기만 해제하고 인증 쿠키를 지웁니다.
- 전경에서는 앱 안에 알림 열기 배너를 표시하고, 백그라운드/일반 종료 상태에서는 OS가 표시할 notification/alert payload를 보냅니다. Android 강제 중지·기기 정책·권한 거부·통신 불가에서 수신을 보장하지 않습니다.
- 알림 클릭 정보는 Preferences에 보관해 로그인/최초 소속 선택 후 처리합니다. 다른 계정의 알림은 열지 않습니다. 수신자 확인 후 기존 게시글 slug/UUID 경로로 이동합니다. 이는 Push 클릭 이동이며 외부 URL의 Universal Links/App Links 설정을 추가한 것은 아닙니다.
- 잠금 화면에는 알림 제목과 짧은 안내만 전달하고 게시글 전체 본문은 포함하지 않습니다. 제목도 개인 정보가 포함될 수 있어 앱 설정 안내와 개인정보 처리방침에 고지합니다.

### Android Firebase SDK 설정

- [루트 Gradle](android/build.gradle)에 Google Services `4.5.0`을 기존 `buildscript` 방식으로 선언합니다. Firebase 안내의 Kotlin DSL `plugins {}` 코드를 중복 추가하지 않습니다.
- [앱 Gradle](android/app/build.gradle)은 Firebase BoM `34.19.0`과 버전 없는 `firebase-messaging`을 참조합니다. FCM에 불필요한 Analytics는 추가하지 않았습니다.
- 로컬 `android/app/google-services.json`이 있으면 Google Services 플러그인을 적용합니다. 잘못된 JSON·패키지 불일치 등은 Gradle 오류로 표시되며 무시하지 않습니다. 파일이 없는 개발 환경에서는 경고를 표시하고 Firebase 미설정 상태의 검증용 빌드만 가능합니다.
- 확인: `node --test tests/firebase-android.test.cjs` 및 `npm run mobile:android:debug`. 다른 PC에서는 같은 Firebase Android 앱의 JSON을 따로 내려받아야 합니다. Firebase SDK/Manifest 병합으로 FCM 관련 구성·권한이 추가되지만 JavaScript 권한 요청·토큰 등록·수신 이벤트 연결이 자동 구현되는 것은 아닙니다.

### 운영에 적용하는 순서

**1. Supabase SQL 적용**

- 기존 `notifications` 테이블이 있어야 합니다. 없다면 먼저 기존 [알림 마이그레이션](supabase/migrations/add_notifications.sql)을 적용합니다.
- Supabase 프로젝트의 **SQL Editor → New query**에서 [add_native_push.sql](supabase/migrations/add_native_push.sql) 전체를 실행합니다. 기존 사용자/게시글/웹 알림을 삭제하지 않고 `push_devices`, `push_jobs`, 트리거와 RPC를 추가합니다.
- 새 테이블은 RLS를 활성화하고 anon/authenticated 직접 접근을 차단합니다. 앱은 로그인 쿠키로 Next.js API를 호출하며, 서버만 기존 Service Role 키를 사용합니다. JWT 사용자 ID는 서버에서 결정합니다.
- 기존 Push SQL을 이미 적용했고 `function uuid_generate_v4() does not exist`가 발생하면 [UUID 보정 SQL](supabase/migrations/fix_native_push_uuid.sql)을 한 번 실행합니다. Supabase의 확장 스키마 검색 경로 문제를 PostgreSQL 기본 `gen_random_uuid()`로 해결하며 기존 기기/알림/작업은 삭제하지 않습니다. 신규 설치용 SQL에도 같은 수정을 적용했습니다.
- SQL은 로컬 PostgreSQL 엔진에서 재실행, 다기기 fan-out, lease 중복 방지·복구, 재시도, 만료 토큰, 계정 전환, 읽음, 로그아웃, 재설치와 테스트 알림 제한을 검사합니다. 운영 DB에 자동 적용한 것은 아닙니다.

**2. Firebase 발송 서버 자격증명 준비**

- Firebase 프로젝트 설정의 서비스 계정에서 발송용 계정을 준비합니다. 해당 계정에 FCM HTTP v1 메시지 발송 권한이 있어야 합니다. 최소 권한으로 관리하고 서버 JSON 개인키를 채팅/앱/Git에 넣지 않습니다.
- 로컬 파일 이름을 `firebase-service-account.json`으로 프로젝트 루트에 저장합니다. `.gitignore`에서 제외되어 있습니다. Android용 `google-services.json`과는 다른 파일입니다.
- 이중 확장자(`firebase-service-account.json.json`)와 Firebase Admin SDK 기본 다운로드 이름도 Git에서 제외합니다. 개인키 파일을 커밋한 뒤 삭제/이름 변경만 해도 이전 커밋에는 남습니다. Push Protection이 차단하면 우회하지 말고 미업로드 기록에서 제거해야 합니다. 복구용 비밀 포함 브랜치는 로컬에만 보관하고 `git push --all`로 업로드하지 않습니다. 커밋에 들어갔던 서비스 계정 개인키는 재발급·기존 키 폐기를 권장합니다.
- `npm run mobile:push:configure`를 실행하면 Firebase 프로젝트 일치를 확인하고 `.env.local`에 서버 설정과 난수 발송 비밀을 기록합니다. 개인키나 비밀은 출력하지 않습니다. 기존 다른 환경변수는 유지합니다.
- 생성한 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `PUSH_DISPATCH_SECRET`, `PUSH_SEND_ENABLED=true`를 **Vercel 프로젝트 → Settings → Environment Variables**에도 안전하게 설정하고 재배포합니다. 로컬 `.env.local` 변경은 Vercel에 자동 반영되지 않습니다.
- Vercel/Vault에는 `NAME=`이나 `.env` 값의 외곽 큰따옴표 없이 값만 입력합니다. Firebase 개인키의 실제 줄바꿈 또는 `\n` 표기를 서버가 처리합니다. 개인키를 화면 캡처/채팅/로그로 공유하지 않습니다.
- 별도 스케줄러가 호출할 `PUSH_DISPATCH_SECRET`은 32자 이상 난수입니다. 클라이언트 번들에 노출하지 않습니다. 발송 미설정 상태의 API는 503을 반환하며 발송 성공처럼 응답하지 않습니다.
- 로컬 수동 발송을 위해 `.env.local`의 `PUSH_SERVER_URL`을 실제 배포 주소(현재 `https://seum-nu.vercel.app`)로 지정합니다. 예시는 [.env.local.example](.env.local.example)에 있습니다.

**3. iOS 자격증명과 Xcode 설정**

- Xcode App 타깃에 개발 팀을 지정하고 Push Notifications capability 및 App ID의 Push 활성화를 확인합니다. [AppDelegate](ios/App/App/AppDelegate.swift)에 APNs 등록 성공/실패 콜백을 연결했고 Debug용 `aps-environment=sandbox` entitlement와 Preferences용 Privacy Manifest를 추가했습니다.
- 서버에 `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`를 설정합니다. Apple에서 만든 APNs `.p8` 키는 서버 비밀로만 보관합니다. Bundle ID는 `life.seum.app`입니다.
- Next.js 빌드 환경의 `NEXT_PUBLIC_APNS_ENVIRONMENT=sandbox`는 현재 Debug entitlement와 일치해야 합니다. 향후 Release 구성에서는 entitlement/프로비저닝/앱 설정을 함께 production으로 전환해야 합니다. 현재 Release/Archive 차단은 유지합니다.
- iOS 컴파일·서명·실기기 수신은 macOS/Xcode에서 별도 확인해야 합니다.

**4. 웹 배포와 앱 재설치**

- `npm run build`를 통과한 웹 변경을 Vercel에 배포합니다.
- Android 휴대폰의 USB 디버깅을 승인한 뒤 `npm run mobile:android:install`을 실행합니다. 새 APK에는 두 플러그인이 포함됩니다. 웹 배포만 하거나 이전 APK만 사용하면 전체 연결이 완료되지 않습니다.
- 앱 로그인·소속 선택 완료 → **내 정보 → 앱 Push 알림 → 알림 권한 요청 / 등록**을 누릅니다. 성공 시 `push_devices`에 자신의 사용자와 연결된 기기가 저장됩니다. UI의 “등록 완료”는 실제 발송/수신 완료와 다릅니다.

**5. 발송 작업자 실행**

- 수동 확인: `npm run mobile:push:dispatch`. 이 명령은 서버의 비밀 인증을 사용해 대기 작업을 처리하고 실패/재시도 결과를 명시합니다. 로컬 개발 서버에서는 `PUSH_SERVER_URL=http://localhost:3000`을 사용할 수 있습니다.
- 명령이 비밀값 누락/32자 미만 오류를 표시하면 로컬 설정을 먼저 수정합니다. 로컬 비밀값을 교체했으면 Vercel과 Vault도 동일하게 갱신합니다. `/login` 리다이렉트 오류는 배포된 middleware/API가 현재 코드와 다른지 확인하고 최신 코드를 배포해야 합니다. 401은 서버 비밀값 불일치, 503은 서버 설정/큐 처리 오류를 확인합니다. 스케줄러 인증은 브라우저 로그인으로 해결하지 않습니다.
- 상시 운영에는 스케줄러가 필요합니다. 권장 옵션은 기존 Supabase의 Cron + pg_net + Vault입니다.
- Supabase Vault에 `seum_push_dispatch_url`(예: `https://seum-nu.vercel.app/api/push/dispatch`)과 `seum_push_dispatch_secret`(Vercel의 `PUSH_DISPATCH_SECRET`과 동일한 값)을 생성합니다.
- 이후 [configure_native_push_dispatch.sql](supabase/migrations/configure_native_push_dispatch.sql)을 SQL Editor에서 실행합니다. 확장 기능을 활성화하고 매분 호출하는 `seum-native-push` 작업을 등록합니다. 관리 권한과 Supabase 확장 지원이 필요하며 운영 프로젝트에서 직접 검증해야 합니다.
- 작업자는 한 번에 5개씩, 호출당 최대 50개/시간 예산 내에서 처리합니다. backlog가 있으면 다음 호출에서 계속합니다. 매분 스케줄에서는 알림 발생 후 호출 대기 시간이 있고 즉시 전달을 보장하지 않습니다.
- 중복 작업은 고유 제약·행 잠금·lease로 방지합니다. 발송 후 결과 저장 직전에 프로세스가 종료되면 재발송될 수 있는 at-least-once 구조입니다. Android tag/APNs collapse ID로 중복 표시를 줄이지만 exactly-once 전달은 보장하지 않습니다.
- 활성 세션이 끝난 기기는 재등록 전까지 발송하지 않습니다. 이미 읽은 알림, 해제/재바인딩된 기기, 24시간 지난 작업은 취소합니다. 최대 8회 지수 backoff 재시도 후 실패로 기록합니다. 진짜 미등록 토큰 응답만 비활성화하며 인증/환경/잘못된 payload 오류 때문에 모든 토큰을 삭제하지 않습니다.

### 실기기 검증

1. 기기 등록 완료 후 **테스트 알림 보내기**를 누릅니다. 본인 계정의 활성 기기에만 작업을 생성하며 1분당 한 번으로 제한합니다. 테스트 알림은 기존 웹 알림에도 저장됩니다.
2. `push_jobs`에서 pending 작업을 확인하고 수동 발송 명령 또는 Cron 실행 후 sent/failed/last_error를 확인합니다. FCM/APNs의 sent는 제공자 접수 결과이며 실제 휴대폰 도착 보장은 아닙니다.
3. 앱 실행 중 배너, 홈 화면으로 나간 상태의 OS 알림, 일반 종료 후 알림과 상세 이동을 확인합니다. 로그인 만료, 다른 계정, 최초 소속 선택, 삭제된 게시글도 테스트합니다.
4. 다른 계정의 댓글/공감 또는 사역자 공지의 “모두에게 알림”으로 기존 알림과 연동되는지 확인합니다. 기존처럼 본인 글에 본인이 남긴 반응은 작성자 알림을 만들지 않습니다.
5. 알림 끄기, 재허용, 로그아웃, 다기기, 토큰 갱신/재설치, 권한 거부를 확인합니다. 로그아웃 전에 접수되어 이미 전달 중인 알림까지 회수할 수는 없습니다.

### 테스트

- `node --test tests/push.test.cjs tests/push-migration.test.cjs tests/firebase-android.test.cjs tests/native-preview.test.cjs`
- PostgreSQL 실행 테스트는 `PUSH_SQL_ENGINE_PATH`에 로컬 `@electric-sql/pglite` 모듈 경로를 지정합니다. 미지정 시 SQL 실행 검사는 명시적으로 skip됩니다. 검증 도구는 세션의 임시 환경에만 설치하며 앱 의존성에 추가하지 않습니다.
- 테스트와 Android 빌드 통과만으로 운영 DB 적용·Vercel 배포·서버 인증·휴대폰 수신·iOS 서명이 검증된 것은 아닙니다.
- 2026-10-05 코드 검증: 로컬 PostgreSQL 실행 검사를 포함한 회귀 테스트 54개 통과, Next.js 운영 빌드 및 Android Debug APK 빌드 통과, APK 내부의 Push/Preferences 플러그인 포함 확인. 기존 린트 경고 2개와 기존 Node 린트 의존성 버전 경고는 남아 있습니다. Firebase 서버 자격증명 부재로 실제 발송·수신은 미검증이며 운영 SQL/배포/스케줄 설정은 자동 수행하지 않았습니다.

---

## 문의

- 시스템 관리자 또는 프로젝트 담당자에게 문의 바랍니다.
