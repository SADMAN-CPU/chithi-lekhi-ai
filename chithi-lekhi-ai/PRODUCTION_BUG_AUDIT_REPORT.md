# PRODUCTION BUG AUDIT REPORT — CHITHI LEKHI AI

**Project:** Chithi Lekhi AI (চিঠি লেখাই এআই)  
**Date:** 2026-09-07  
**Audit Scope:** Real-world end-to-end audit (User journeys, Functional, UI/UX, AI quality, Performance, Security, Accessibility, Edge Cases)

---

### Bug 1: Missing Global & Route Error Boundaries (C1)
- **Category:** Functional / Architecture
- **Severity:** Critical
- **User Impact:** Any unhandled runtime exception (rendering failure, audio initialization issue, bad payload) completely crashes the application and presents an unstyled raw Next.js developer crash screen.
- **Steps to reproduce:** 
  1. Trigger an unexpected runtime error in client component or route.
  2. The page turns into a blank/raw Next.js error screen with no way for the user to recover or return home.
- **Expected behavior:** A warm, branded error boundary screen in Bengali and English with a "পুনরায় চেষ্টা করুন" (Try Again) button and "হোমপেজে ফিরে যান" (Return Home) button.
- **Actual behavior:** Next.js throws uncaught client-side render crash with no custom error boundary.
- **Root cause:** Neither `src/app/error.tsx` nor `src/app/global-error.tsx` were defined.
- **Affected files:**
  - `src/app/error.tsx` (NEW)
  - `src/app/global-error.tsx` (NEW)

---

### Bug 2: Web Audio API Filter Graph Never Disconnects / Bypasses (C2)
- **Category:** Functional / Audio / State
- **Severity:** Critical
- **User Impact:** When a user selects "vintage-radio" style, a bandpass filter is connected to the audio output. When switching back to "warm", "emotional", or other styles, the filter is never detached or bypassed. All subsequent audio generations remain permanently muffled until a hard page reload.
- **Steps to reproduce:**
  1. Generate voice for a letter using "vintage-radio" style.
  2. Switch voice style to "warm" or "emotional" and re-generate.
  3. Listen to the audio: the output is still filtered through the bandpass node.
- **Expected behavior:** Selecting "warm" or "emotional" should bypass or disconnect the radio bandpass filter and play clean, full-spectrum audio.
- **Actual behavior:** The BiquadFilterNode remains wired in series between the source and destination nodes forever.
- **Root cause:** In `VoiceLetterPlayer.tsx`, the `useEffect` on `[selectedStyle, radioDspEnabled]` only adds the filter node when active, but never disconnects it or reconnects direct to `ctx.destination` when switched off.
- **Affected files:**
  - `src/components/letter/VoiceLetterPlayer.tsx`

---

### Bug 3: Missing Custom 404 Not-Found Page (H1)
- **Category:** UI/UX / Navigation
- **Severity:** High
- **User Impact:** Users visiting broken or expired letter links see the default unbranded Next.js 404 page, eroding user trust.
- **Steps to reproduce:**
  1. Visit `/c/non-existent-letter` or `/invalid-url`.
  2. Observe the unbranded, generic 404 page.
- **Expected behavior:** A warm vintage-themed Bengali/English 404 page with navigation back to letter writing.
- **Actual behavior:** Next.js default minimal 404 page rendered.
- **Root cause:** Absence of `src/app/not-found.tsx`.
- **Affected files:**
  - `src/app/not-found.tsx` (NEW)

---

### Bug 4: Unmounted Component Memory Leak in Letter Generation (H3)
- **Category:** Performance / Stability
- **Severity:** High
- **User Impact:** If a user navigates away or closes the letter generator while AI generation is in progress, the step timer keeps executing indefinitely in the background, consuming memory and triggering React unmounted component warnings.
- **Steps to reproduce:**
  1. Fill form and click "চিঠি রচনা করুন".
  2. Immediately navigate to another page while generation is active.
  3. Notice interval timer keeps firing in the background.
- **Expected behavior:** Interval timer is automatically cleared when the component unmounts.
- **Actual behavior:** `stepInterval` is scoped locally in `handleSubmit` and only cleared in `finally` if the component stays mounted.
- **Root cause:** Interval ID not tracked in a `useRef` or unmount cleanup hook.
- **Affected files:**
  - `src/components/generator/EmotionalStorytellerForm.tsx`

---

### Bug 5: Multi-Page Image Export Rapid Fire Browser Blocking (H4)
- **Category:** Functional / Export
- **Severity:** High
- **User Impact:** When exporting multi-page vintage cards as PNGs, rapid sequential programmatic clicks (`link.click()`) trigger modern browser popup/multiple download blockers, resulting in only Page 1 being downloaded and subsequent pages silently failing.
- **Steps to reproduce:**
  1. Create a letter spanning 3+ pages in `VintageLetterVisualStudio`.
  2. Click "সকল পৃষ্ঠা ডাউনলোড করুন" (Download All Pages).
  3. Chrome/Safari blocks multiple file downloads after the first page.
- **Expected behavior:** Downloads should be spaced with a human-safe cadence (400-500ms delay) so the browser cleanly prompts or saves each file.
- **Actual behavior:** Delay was only 60ms, triggering browser spam defenses.
- **Root cause:** Insufficient throttling in batch download loop in `VintageLetterVisualStudio.tsx`.
- **Affected files:**
  - `src/components/letter/VintageLetterVisualStudio.tsx`

---

### Bug 6: Dashboard Optimistic State Deletion Without Error Rollback (H5)
- **Category:** Functional / UX / Data Integrity
- **Severity:** High
- **User Impact:** If a user deletes a letter and the network drops or API returns 500, the letter disappears from the UI immediately without notifying the user that deletion failed, leading to data inconsistency.
- **Steps to reproduce:**
  1. Disable network or simulate server error.
  2. Delete a letter from the dashboard.
  3. UI removes the letter, but on refresh it reappears.
- **Expected behavior:** UI should rollback to the previous state and show an error notification if the API call fails.
- **Actual behavior:** Letters array is filtered optimistically with no `catch` restoration.
- **Root cause:** `handleDeleteLetter` does not capture snapshot state for rollback.
- **Affected files:**
  - `src/app/dashboard/page.tsx`

---

### Bug 7: Dashboard Save Edit Silently Fails on Non-200 Responses (M11)
- **Category:** Functional / UX
- **Severity:** Medium
- **User Impact:** When editing a letter title or body from the dashboard modal, if the server returns an error (400, 403, 500), the app does not check `res.ok`, fails silently, and closes the editor without saving.
- **Steps to reproduce:**
  1. Open Edit Letter modal in dashboard.
  2. Submit while server returns non-200.
  3. Modal closes without informing the user that changes were lost.
- **Expected behavior:** Alert the user with an error message and keep modal open for re-try.
- **Actual behavior:** No `res.ok` check, silently ignores failure.
- **Root cause:** Missing `if (!res.ok)` check in `handleSaveEdit`.
- **Affected files:**
  - `src/app/dashboard/page.tsx`

---

### Bug 8: Accessibility: Form Error Message Missing `role="alert"` (M1)
- **Category:** Accessibility
- **Severity:** Medium
- **User Impact:** Screen reader users who submit invalid forms do not get dynamic audio announcements of the validation error.
- **Steps to reproduce:**
  1. Enable VoiceOver / screen reader.
  2. Submit empty form.
  3. Error appears visually but is not voiced.
- **Expected behavior:** `aria-live="polite"` and `role="alert"` should announce errors immediately.
- **Actual behavior:** Standard `<div>` without ARIA semantics used.
- **Root cause:** Missing ARIA attributes on error container.
- **Affected files:**
  - `src/components/generator/EmotionalStorytellerForm.tsx`

---

### Bug 9: Suggestion Chips Under 44px Touch Target Size on Mobile (M2)
- **Category:** UI/UX / Mobile Performance
- **Severity:** Medium
- **User Impact:** Quick suggestion chips for memories, situations, and feelings are ~28-32px tall, making them difficult to tap accurately on 120Hz smartphones and causing frustrating mis-taps.
- **Steps to reproduce:**
  1. Open letter generator on mobile device.
  2. Attempt to tap suggestion chips.
  3. Tight tap target leads to accidental taps on neighboring chips.
- **Expected behavior:** Touch target should meet Apple Human Interface Guidelines minimum of 44px.
- **Actual behavior:** Chips use `py-1 px-2.5` without minimum height constraint.
- **Root cause:** Sub-44px padding without `min-h-[44px]` container sizing.
- **Affected files:**
  - `src/components/generator/EmotionalStorytellerForm.tsx`

---

### Bug 10: Untranslated English Keys in Bengali Dictionary (`bn.json`) (M6)
- **Category:** i18n / Localization
- **Severity:** Medium
- **User Impact:** In Bengali mode, several buttons and labels appear in English ("Save Letter ❤️", "Heartfelt & poetic English prose", mixed headers), causing visual inconsistency.
- **Steps to reproduce:**
  1. Switch language to বাংলা.
  2. Look at preview buttons and settings descriptions.
- **Expected behavior:** 100% authentic, high-quality Bengali typography throughout.
- **Actual behavior:** English phrases appear in Bengali localization.
- **Root cause:** Placeholder English text left in `src/messages/bn.json`.
- **Affected files:**
  - `src/messages/bn.json`

---

### Bug 11: Authentication Forms Lack `htmlFor`/`id` Association (M12)
- **Category:** Accessibility / UX
- **Severity:** Medium
- **User Impact:** Clicking on form labels (Email, Password, Name, OTP) does not focus the input fields. Screen readers cannot properly associate labels with controls.
- **Steps to reproduce:**
  1. Click on "ইমেইল" or "পাসওয়ার্ড" label on login/signup page.
  2. Focus does not move to the input field.
- **Expected behavior:** Clicking a label should immediately focus its corresponding input.
- **Actual behavior:** Missing `id` on `<input>` and `htmlFor` on `<label>`.
- **Root cause:** Labels and inputs were rendered without explicit matching `id`/`htmlFor`.
- **Affected files:**
  - `src/app/login/page.tsx`
  - `src/app/signup/page.tsx`
  - `src/app/forgot-password/page.tsx`

---

### Bug 12: Authentication Error Messages Inflexible Concatenation (M8)
- **Category:** i18n / Code Quality
- **Severity:** Low
- **User Impact:** Concatenating `t('auth.email') + ' & ' + t('auth.password')` produces awkward grammatical errors in Bengali and other languages.
- **Steps to reproduce:**
  1. Submit empty login form.
  2. Notice message: "ইমেইল & পাসওয়ার্ড".
- **Expected behavior:** "অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন।"
- **Actual behavior:** Raw `&` joined string.
- **Root cause:** Missing dedicated translation key `auth.emailPasswordRequired`.
- **Affected files:**
  - `src/messages/en.json`
  - `src/messages/bn.json`
  - `src/app/login/page.tsx`
  - `src/app/signup/page.tsx`

---

### Bug 13: Uncleaned Timer Timeouts Causing State Updates on Unmounted Modals (L1)
- **Category:** Performance / Stability
- **Severity:** Low
- **User Impact:** If a user copies text and closes a modal before the 2000ms copied feedback timeout finishes, React emits unmounted state update warnings.
- **Steps to reproduce:**
  1. Click Copy in SaveLetterModal or LetterPreviewCard.
  2. Immediately close the modal.
- **Expected behavior:** Timeouts automatically cleaned up on unmount.
- **Actual behavior:** Dangling timeouts fire `setCopied(false)` after component unmounts.
- **Root cause:** Missing unmount cleanup in `useEffect` or local timeout trackers.
- **Affected files:**
  - `src/components/letter/VoiceLetterPlayer.tsx`
  - `src/components/letter/LetterPreviewCard.tsx`
  - `src/components/letter/SaveLetterModal.tsx`

---

### Bug 14: Navbar Envelope Emoji Lacks `aria-hidden` (L7)
- **Category:** Accessibility
- **Severity:** Low
- **User Impact:** Screen reader announces "envelope" redundantly after reading the localized "চিঠি লিখুন" button.
- **Steps to reproduce:**
  1. Inspect Navbar "Write Letter" action with screen reader.
- **Expected behavior:** Decorative emoji is ignored by assistive tech (`aria-hidden="true"`).
- **Actual behavior:** Plain `<span>✉️</span>` read out aloud.
- **Root cause:** Missing `aria-hidden="true"`.
- **Affected files:**
  - `src/components/layout/Navbar.tsx`
