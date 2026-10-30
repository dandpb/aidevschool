# Intent

Boot loads valid progress, then reads it again to choose a destination. If that second read fails or returns an invalid record, the app can show onboarding with old progress or remain loading without an explanation. Surface recovery without treating an unreadable record as absent.
