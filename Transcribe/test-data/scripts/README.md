# Test meeting scripts

One file per test meeting. Each line is `ADVISOR: ...` or `CLIENT: ...`; lines starting with `#` are
notes and are not spoken. Teammates can read these aloud, or generate audio with macOS `say`:

    cd server && bun scripts/make-test-audio.ts ../test-data/scripts/03-guarantee-pressure.txt

What each script should and should not trigger is in `../answer-key.json`. All names, numbers and
addresses are made up.
