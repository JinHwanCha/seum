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
- Splash의 별도 브랜드 디자인, Push 플러그인, 토큰 등록, 발송 및 딥링크는 아직 구현하지 않았습니다.

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

## 11. Supabase를 유지하는 모바일 Push 연결 준비

Firebase는 DB·로그인을 대체하지 않습니다. Android의 FCM 전송용으로 사용하며, 사용자·게시글·기존 알림·기기 토큰·발송 기록은 Supabase에서 관리할 수 있습니다. Play Console의 패키지/서명 등록과 Firebase 앱 등록은 별개입니다.

### Firebase에서 먼저 준비할 것

1. Firebase Console에서 SEUM용 프로젝트를 생성하거나 기존 프로젝트를 선택합니다. Push만을 위해 Firestore나 Firebase Auth를 활성화할 필요는 없습니다.
2. Android 앱 추가에서 패키지 이름을 정확히 `life.seum.app`으로 입력합니다. 단순 FCM 등록 자체에 로그인용 SHA 인증서 지문을 필수로 추가할 필요는 없습니다.
3. 해당 앱의 `google-services.json`을 다운로드해 `android/app/google-services.json`에 둡니다. 저장소에서 제외되어 있으며, 앱 설치/동기화만으로 Console 설정이 자동 생성되지는 않습니다.
4. 프로젝트의 FCM HTTP v1 API 활성 상태와 발송 서버 권한을 확인합니다. 서버용 서비스 계정 개인키는 앱·`NEXT_PUBLIC_` 변수·Git·채팅에 넣지 않습니다. 구현 시 서버 비밀 설정으로 연결합니다.
5. iOS도 같은 Firebase 프로젝트에 Bundle ID `life.seum.app`으로 추가할 수 있습니다. FCM 통합 방식으로 구현할 경우 `GoogleService-Info.plist`와 Apple APNs 인증 키/팀 ID/키 ID 연결, Xcode Push capability와 개발 팀 서명이 필요합니다. 기본 Capacitor Push 플러그인의 iOS 토큰은 APNs 토큰이므로 Android FCM 토큰과 혼동하면 안 됩니다.

### 이후 코드 구현 및 검증 순서

1. 네이티브 Push 플러그인과 설정을 선택하고 Android 권한·채널·등록/갱신 이벤트를 연결합니다.
2. 로그인한 사용자 기준 기기 등록·해제 API와 Supabase 저장 구조를 추가합니다. 여러 기기·토큰 교체·로그아웃·계정 전환을 처리합니다.
3. 기존 알림 저장과 연계한 내구성 있는 발송 큐를 추가하고, 인증된 발송 작업자가 FCM/APNs 결과를 기록·재시도·만료 토큰 정리합니다. 요청 종료 후 단순 fire-and-forget으로 발송하지 않습니다.
4. Push 클릭 시 기존 게시글 상세 경로로 이동합니다. 세션 만료/최초 소속 선택 후에도 목적지를 유지하고 수신 사용자·접근 권한을 확인합니다.
5. 실제 Android/iPhone에서 권한 거부·전경·백그라운드·일반 종료·다기기·로그아웃·중복 발송을 검증합니다. Android 강제 중지 등 OS 제한 상황은 일반 종료와 구분합니다.

현재는 준비 안내 단계이며 Push 플러그인·토큰 API·발송 큐가 구현된 상태가 아닙니다. 설정 파일을 놓는 것만으로 기존 공지가 자동 발송되지는 않습니다.

---

## 문의

- 시스템 관리자 또는 프로젝트 담당자에게 문의 바랍니다.
