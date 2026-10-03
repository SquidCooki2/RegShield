# Meeting compliance rules

These rules are built from public regulations and LPL Financial's public disclosures, not LPL's
internal compliance manual. The same file is used for live checks and full analysis.

How to read the transcript:

- Each line is `[mm:ss] speaker: text`. Speakers are labels (spk_0, spk_1, ...), not roles; work out who is the advisor and who is the client from context.
- `[PII]`, `[NAME]`, `[PHONE]` and similar tags are redacted personal information. Never guess what they hid.
- Only flag what was actually said. A rule that applies to the advisor is not broken by something the client says.

---

## R1: Promises or guarantees

- **Applies to:** advisor
- **Flag:** stating or implying that an investment can't lose, has guaranteed returns, or is risk-free.
  - "This fund basically can't lose."
  - "You're guaranteed to make at least 8% a year."
- **Do NOT flag:** standard disclaimers or accurate descriptions of guaranteed products.
  - "Past performance doesn't guarantee future results."
  - "The CD is FDIC-insured up to the limit."
- **Default severity:** high
- **Source:** FINRA Rule 2210
- **Nudge:** Avoid language that suggests guaranteed returns.

## R2: Unapproved products (selling away)

- **Applies to:** advisor
- **Flag:** offering or recommending investments outside the firm's approved products.
  - "I can get you into a private crypto deal a friend is running."
- **Do NOT flag:** products available through the firm, or the client mentioning outside investments they already hold.
- **Default severity:** high
- **Source:** LPL representative agreement; FINRA Rule 3280
- **Nudge:** Only discuss firm-approved products.

## R3: Outside business activity

- **Applies to:** advisor
- **Flag:** the advisor mentioning a business, paid role, or venture outside the firm, especially if offered to the client.
  - "I also run a real estate fund on the side."
- **Do NOT flag:** personal hobbies with no business or pay ("I coach my kid's soccer team").
- **Default severity:** medium (the reviewer checks whether it was approved)
- **Source:** LPL representative agreement; FINRA Rule 3270
- **Nudge:** Outside business activities need prior approval.

## R4: Weak best-interest basis

- **Applies to:** advisor
- **Flag:** recommending a product, switch, or rollover with no discussion of the client's goals, risk tolerance, or costs; rushing or pressuring the client to decide.
  - "Just sign today, we'll go over the details later."
- **Do NOT flag:** recommendations that cover goals, risks, costs, or alternatives.
- **Default severity:** medium; high when combined with pressure or a large rollover
- **Source:** SEC Regulation Best Interest
- **Nudge:** Cover the client's goals, risks, and costs before recommending.

## R5: AML red flags

- **Applies to:** anyone
- **Flag:** structuring cash to avoid reporting (splitting deposits to stay under $10,000), unexplained third-party money, or an advisor helping with either.
  - "Can I deposit the cash in a few chunks so it stays under ten thousand?"
- **Do NOT flag:** ordinary transfers with a clear explanation ("I'm moving my savings from my other bank").
- **Default severity:** high
- **Source:** Bank Secrecy Act; FINRA Rule 3310
- **Nudge:** Don't advise on splitting deposits; escalate to compliance.
