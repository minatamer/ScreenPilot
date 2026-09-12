# ElevenLabs agent setup

The authoritative owner guide is
[ScreenPilot live-provider setup](./live-provider-setup.md#elevenlabs-elevenagents).
It consolidates OpenAI API Platform, ElevenLabs ElevenAgents, Cloudflare
Turnstile, local signing-secret, safe-environment, fake-to-live, rotation, and
manual-verification instructions so credential guidance does not drift between
documents.

The source-controlled ElevenLabs target remains
`apps/backend/src/providers/elevenlabs/elevenlabs-agent-config.ts`. Do not put an
API key, conversation token, candidate content, real audio, transcript, or
complete dashboard export in this repository.

SP-014A documents the account and dashboard setup. SP-016 owns the five client
tool schemas and real dispatch, SP-017 owns the final interviewer prompt, SP-018
owns voice tuning, SP-025 owns release cost evidence, and SP-026 owns
deployment.
