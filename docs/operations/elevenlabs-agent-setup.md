# ElevenLabs agent setup and SP-014 verification

This runbook separates the source-controlled ScreenPilot contract from the account changes and live microphone checks that require the project owner's ElevenLabs and Cloudflare access.

## Source-controlled target

The executable target is `apps/backend/src/providers/elevenlabs/elevenlabs-agent-config.ts`. Keep the dashboard aligned to it:

| Setting | Locked target |
| --- | --- |
| Platform and access | One private ElevenAgents agent; WebRTC only |
| Speech to text | Scribe v2 Realtime |
| Live model | GPT-5.4 mini; reasoning/thinking `none`; 160-output-token ceiling |
| Speech synthesis | Flash v2.5; voice selected by the owner and referenced by `ELEVENLABS_VOICE_ID` |
| First message | `Hi, what's your name?` |
| Conversation | Normal turn eagerness; 12-second turn timeout; interruptions enabled; soft timeout disabled; 480-second maximum |
| Privacy | Audio saving disabled; transcript retention `0` days/the shortest available locked setting |
| Dynamic variables | `screenpilot_policy_version`, `screenpilot_entry_mode`, `screenpilot_demo_disclosure`, `screenpilot_screening_plan`, `screenpilot_role_context`, `screenpilot_cv_context` |
| Browser tool names | `recordInsight`, `correctInsight`, `markTopic`, `recordCandidateQuestion`, `requestFollowup` |

SP-014 registers the five browser tool names with safe non-mutating handlers. SP-016 owns their strict argument schemas, evidence validation, and real local dispatcher. SP-017 owns the full source-controlled interviewer prompt. Neither later ticket may add a role-specific agent, tool set, or prompt replacement.

Default fake development uses `fake-voice-session.tsx`, completes the local state transition deterministically, and does not load or mount the ElevenLabs React session. The real SDK bridge is lazy-loaded only when trusted backend bootstrap returns `paidVoiceEnabled: true`. Terminal SDK errors, a mismatched provider conversation ID, and unrecoverable interruptions request one immediate provider teardown and unmount the bridge before showing recovery state.

The current source record deliberately has `agentRevisionId: null`. Replace it with the published provider revision identifier only after the real agent is created and the dashboard is verified. Do not copy an API key, conversation token, candidate content, or complete dashboard export into this repository.

## Credential and dashboard gate

Keep these values blank in the committed `apps/backend/.env.example`. Put real values only in the ignored `apps/backend/.env.local`:

```dotenv
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_VOICE_ID=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ALLOWED_HOSTNAMES=
```

Before adding values, run `git check-ignore apps/backend/.env.local`. Create a restricted ElevenLabs API key, choose the approved voice, create and publish one private agent, apply the target table above, and record the published revision in the source-controlled manifest. Keep `PAID_DEMO_ENABLED=false` until the account limits and spend controls are ready for one controlled run.

The private token endpoint uses the backend API key to call ElevenLabs. The browser receives only the provider conversation ID and short-lived conversation token. It never receives the backend key, configured agent ID, voice ID, prompt, or tool definitions through this route.

## SP-025 cost evidence

For the later release-cost worksheet, read the completed conversation and account usage entries in ElevenLabs rather than estimating the live-model charge from local token counts. Record:

- connected duration for the conversation;
- included agent minutes consumed;
- whether billed minutes were standard or burst;
- ElevenLabs credit deduction; and
- the native GPT-5.4 mini amount shown by the model selector's **Detailed costs** and the usage dashboard.

Do not send these values to ScreenPilot analytics or add a billing database. The release worksheet is manual and contains no candidate transcript or audio.

## Owner-only manual verification

No real microphone or paid-provider test is part of deterministic development or CI. After credentials, agent publication, Turnstile hostname/action setup, account limits, and explicit paid-test approval are available, the owner should verify:

1. Confirm `apps/backend/.env.local` is ignored, fill the six values above, enable the paid demo for the controlled run, and start both applications.
2. Complete either preparation path, accept the disclosure, grant microphone permission, confirm the intended device label and responsive level meter, and select/retry the device if necessary.
3. Click **Start AI interview** once. Confirm exactly one `POST /v1/voice/token` request and exactly one ElevenLabs WebRTC conversation appear; repeated clicking must not create a second request or session.
4. Confirm the route response has `Cache-Control: no-store`, contains only `conversationId` and `conversationToken`, and does not expose the ElevenLabs API key, agent ID, voice ID, prompt, or tool schemas.
5. Confirm the SDK reports connected, the configured first message is audible, candidate speech produces the expected provider interaction, interruption works, and cancelling during connection returns to a fresh preflight without fallback audio or a recording artifact.
6. Inspect the page URL, browser storage, browser console/network metadata, and backend logs. No Turnstile token, conversation token, API key, microphone audio, candidate content, or provider debug payload may persist or be logged.
7. Repeat the start with an expired grant and with provider access rejected; confirm neither path starts a substitute provider and recovery copy returns to the documented preparation/preflight stage.
8. Verify the published agent revision, Scribe/GPT/Flash identifiers, selected voice, WebRTC access, 480-second limit, interruptions, audio-saving setting, and zero-day/shortest retention setting in the ElevenLabs dashboard.
9. Repeat the connection UI check at the project phone, tablet, laptop/desktop, large-monitor anchors, and one intermediate drag-resized width, including keyboard focus and reduced motion.

After the run, turn the paid-demo switch back off unless the public spend controls are intentionally ready. Record the revision and the non-sensitive SP-025 cost fields; do not commit `.env.local` or any test recording/transcript.
