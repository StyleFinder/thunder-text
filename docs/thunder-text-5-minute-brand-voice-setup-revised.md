# Thunder Text — 5-Minute Brand Voice Setup (Revised)

_Project Spec for Claude Code Implementation_

> **Important compatibility note**  
> This spec must be implemented **against the existing Thunder Text codebase and Supabase schema**.
>
> - Reuse existing tables / columns where possible.
> - Do **not** rename or drop existing columns.
> - If a `brand_voice_profiles` (or equivalent) table already exists, **extend it minimally** instead of recreating it.
> - If a “writing samples” / example text feature already exists, **reuse that flow for Step 5** rather than introducing a new table or breaking change.

## 1. Purpose & Scope

This document defines how to implement the **revised 5-minute brand voice setup** inside Thunder Text so that every store gets a lightweight but powerful brand voice profile used for product descriptions.

This spec is for:

- **Onboarding flow** when a store installs Thunder Text
- **Data model** to store brand voice (new or extended)
- **API layer** to read/write the brand voice profile
- **Prompt assembly** that combines:
  1. Master template
  2. Product-specific template
  3. Brand voice profile

Goals:

- Collect high-signal voice data in **under 5 minutes**
- Reduce cognitive load and “blank page anxiety”
- Ensure compatibility with the **existing Thunder Text + Supabase stack**

## 2. High-Level Workflow

1. Detect if the store has a saved **brand voice profile**.
2. If **no profile**, trigger the **5-minute setup wizard** after installation or before first product description generation.
3. Wizard has **5 steps**:
   1. Brand Personality (tone sliders)
   2. Brand Linguistics (guided, not open-ended)
   3. Value Pillars (customer-centric)
   4. Audience Snapshot (free-text)
   5. Example Content (reuse existing “upload writing descriptions” flow)
4. Save the resulting profile to the DB (extend existing tables where needed).
5. On product-description generation:
   - Load brand voice profile
   - Inject it into the OpenAI system prompt alongside:
     - Master template
     - Product template
     - Product data

## 3. Data Model (Compatibility-First)

### 3.1. Core Table: `brand_voice_profiles` (or Existing Equivalent)

If a `brand_voice_profiles` table already exists, **do not break it**.  
Instead:

- Reuse existing columns that match these concepts.
- Only **add new columns** if absolutely required.
- Keep existing names (e.g. `signature_sentence`) even if the meaning shifts slightly (e.g. now used as “tagline/motto”).

If no such table exists, create a new one with fields like these (PostgreSQL / Supabase):

- `id` (uuid, primary key)
- `store_id` (text / uuid, FK to stores/shops table, unique)

**Tone sliders (unchanged):**

- `tone_playful_serious` (integer, 0–10)
- `tone_casual_elevated` (integer, 0–10)
- `tone_trendy_classic` (integer, 0–10)
- `tone_friendly_professional` (integer, 0–10)
- `tone_simple_detailed` (integer, 0–10)
- `tone_bold_soft` (integer, 0–10)

**Brand linguistics (guided but stored simply):**

- `words_love` (text or jsonb)
- `words_avoid` (text or jsonb)
- `customer_term` (text)
- `signature_sentence` (text)
  - **Use this to store the brand tagline / motto.**
  - If the column already exists, keep the name and update how you use it in prompts.

**Value pillars (customer-centric):**

- `value_pillars` (jsonb)
  - Array of string enums, e.g. `["Comfort", "Fit", "Quality"]`

**Audience snapshot (free text):**

- `audience_description` (text)
  - Free-form sentence/paragraph written by the store owner.

**Example content:**

- If there is already a table or column[s] storing **writing samples / example descriptions**, keep using that.
- If not, you may use something like:
  - `example_texts` (jsonb) – array of `{ "type": string, "content": string }`

Timestamps:

- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now, trigger on update)

### 3.2. Compatibility Guidance

- Before adding any new table/column, **inspect the existing schema** and map these concepts to existing fields where possible.
- If you must add columns, **only append**; do not modify or delete existing columns so Thunder Text’s current features remain intact.

## 4. Onboarding UX Flow (5 Steps, Revised)

The flow remains a React multi-step wizard but with adjusted questions to reduce friction.

### 4.1. Entry Conditions

Trigger the wizard when:

- A store connects Thunder Text **for the first time**, or
- A store first attempts to **generate a product description** and no brand voice profile exists.

Show a simple modal / full-page message:

> “Let’s teach Thunder Text how your store sounds.  
> It takes about 5 minutes and makes your product descriptions sound like YOU.”

Primary CTA: **“Start Brand Voice Setup”**

### 4.2. Step 1 — Brand Personality (Tone Sliders)

**Keep the sliders as originally spec’d.**

UI: 6 horizontal sliders, each 0–10 (or 1–5) with labels on both ends:

1. **Playful ↔ Serious**
2. **Casual ↔ Elevated**
3. **Trendy ↔ Classic**
4. **Friendly ↔ Professional**
5. **Simple ↔ Detailed**
6. **Bold ↔ Soft**

For each slider, you can show 2–3 tiny sample phrases under the extremes to illustrate the difference (optional but helpful).

On submit:

- Save values to local wizard state.
- Defer writing to DB until the final step.

### 4.3. Step 2 — Brand Linguistics (Guided)

Goal: reduce “blank page” thinking while still collecting high-signal linguistic info.

#### 4.3.1. Words You Love to Use

Prompt:

> “Which words feel **most like your brand**?  
> These are words you’d be happy to see in your product descriptions.”

UI pattern:

- Show a short explanatory line:
  > “Pick a few from the suggestions or type your own. 3–7 is plenty.”
- Provide clickable chips as **optional suggestions** (e.g. “cozy”, “elevated”, “everyday”, “confident”, “bold”, “timeless”, etc.).
  - The exact suggestions can be tuned later.
- Allow the user to:
  - Click chips to add them
  - Type custom words into a tag input

Store result as a list in `words_love` (array or comma-separated text).

#### 4.3.2. Words You Never Want Used

Prompt:

> “Any words or phrases you **never** want Thunder Text to use?”

Guidance text:

> “Think of words that feel off-brand, overused, or that your customers don’t like.  
> Example: cheap, sexy, gals, slay, etc.”

UI:

- Same tag-style input as above, but with a softer requirement.
- Add helper text: “You can leave this blank if nothing comes to mind.”

Store as `words_avoid`.

#### 4.3.3. How You Refer to Your Customer

Prompt (unchanged concept, slightly clearer):

> “How do you usually refer to your customer in your copy?”

Helper text (read-only hints, not selectable options):

> “Examples: girl, babe, friend, you, mama, shopper, beauty, etc.”

UI:

- Single short text input, e.g. `"you"` or `"girl"`.

Store as `customer_term`.

#### 4.3.4. Brand Tagline or Motto

Instead of “one sentence that sounds like your brand,” explicitly ask for a tagline/motto.

Prompt:

> “What is your **brand tagline or motto**?”

Helper text:

> “If you don’t have an official tagline, write one sentence you’d love customers to remember about your brand.”

Examples may appear as faint placeholders only (do NOT pre-fill the value), e.g.:

> “Style that actually fits your real life.”

Store this in the existing `signature_sentence` column (or equivalent).

- **Note:** if `signature_sentence` already exists, simply reuse it to store this “tagline/motto” content. No schema change needed.

### 4.4. Step 3 — Value Pillars (Customer-Centric)

The main change here is the framing: we want the **customer’s priorities**, not the store’s self-image.

Prompt:

> “What are the top things your **customer cares about most** when shopping with you?”

Helper text:

> “Pick 1–3. Think about what matters most to them when they decide to buy.”

Options (same list as before, but now clearly customer-focused):

- Comfort
- Fit
- Quality
- Trends
- Sustainability
- Inclusivity
- Affordability
- Luxury
- Everyday wear
- Statement pieces
- Community
- Fast shipping

UI:

- Multi-select checkboxes with validation:
  - Require at least **1**.
  - Soft maximum of **3** (warn if more, but don’t strictly block unless desired).

Store as `value_pillars` array (jsonb or equivalent).

### 4.5. Step 4 — Audience Snapshot (Free Text)

Instead of multi-select tags, this is now a **simple fill-in-the-blank** with no examples.

Prompt:

> “Who do you primarily sell to?”

Guidance (short, not prescriptive):

> “Describe your typical customer in your own words.”

UI:

- Single multi-line text area.
- No suggested examples list to avoid biasing the answer.

Store in `audience_description` (text).

- If you already have an “audience” or “ideal customer” field, reuse it.

The model will later parse this free text to infer audience characteristics.

### 4.6. Step 5 — Example Content (Reuse Existing Flow)

> **Important:** You already have logic to “upload writing descriptions that the store owner likes.” Reuse that feature and associated tables/columns. Do **not** introduce new, conflicting storage here.

Prompt:

> “Paste 2–3 product descriptions or social posts that feel most like your brand. Thunder Text will learn your style from these.”

Implementation notes:

- Use the existing UI and Supabase tables/code that collect sample or favorite descriptions.
- No need to introduce preset brand samples or generic presets.
  - **Do not** show pre-written “sample brands” for them to choose from.
- Do **not** add new example-text preset logic in this spec. Simply map this step conceptually to whatever is already in place for writing samples.

Schema / code:

- **Do not** provide new code or schema specifics here; simply ensure Step 5 **links to and reuses** the current implementation for “writing descriptions the store owner likes.”

## 5. API Design (Adjust vs. Replace)

> Note: If a brand voice API already exists, **adjust it** to match the new fields rather than replacing it entirely.

### 5.1. Endpoint: Get Current Brand Voice

`GET /api/brand-voice`

- If an equivalent endpoint exists, extend its response to include:
  - `audience_description` (if new)
  - Any new columns added for the revised flow

### 5.2. Endpoint: Create / Update Brand Voice

`POST /api/brand-voice`

- Extend the existing payload / handler to accept the revised fields:
  - Tone sliders (unchanged)
  - `words_love`
  - `words_avoid`
  - `customer_term`
  - `signature_sentence` (tagline/motto)
  - `value_pillars`
  - `audience_description`
- Preserve existing behavior for any legacy fields.

Auth behavior and store scoping remain as-is (rely on existing shop/session logic).

## 6. Prompt Assembly for OpenAI (Same Structure, New Semantics)

Whenever Thunder Text generates a product description, it should:

1. Load:
   - Master system template
   - Product-specific template (e.g., women’s clothing)
   - Brand voice profile for the current store (including **audience_description** and **tagline**)
   - Product data (title, images, tags, etc.)

2. Inject the brand voice profile into the system message, updating the instructions to explicitly use:

- Tone sliders as style direction
- `words_love` as preferred vocabulary
- `words_avoid` as banned vocabulary
- `customer_term` when speaking directly to the shopper
- `signature_sentence` as the brand’s tagline/motto
- `value_pillars` framed as **customer priorities**
- `audience_description` as audience context
- Any existing writing samples from Step 5 as style references

3. Do **not** change the core master template logic; just ensure it can see and use these brand voice fields.

## 7. Edge Cases & Fallbacks

1. **No brand voice profile yet**
   - Trigger the wizard (or keep existing fallback behavior).
   - Do not introduce new preset brand samples.

2. **User skips words_avoid**
   - Allow it. Treat missing/empty as “no explicit banned words.”

3. **Very short audience description**
   - Still store it; the model can fall back to more generic behavior.

4. **Existing brand voice data present**
   - Pre-populate the wizard fields with current data so users can edit rather than start over.
   - Preserve legacy behavior where possible.

## 8. Implementation Checklist (Revised)

1. **Schema Review**
   - [ ] Inspect existing Supabase tables related to brand voice and writing samples.
   - [ ] Map this spec’s fields to existing columns where possible.
   - [ ] Only add new columns where necessary (e.g., `audience_description`).

2. **API Layer**
   - [ ] Update `GET /api/brand-voice` to return any new fields.
   - [ ] Update `POST /api/brand-voice` to accept new fields while preserving old ones.

3. **Frontend Wizard**
   - [ ] Step 1 (Tone sliders): keep as is.
   - [ ] Step 2 (Brand linguistics): implement guided tag inputs + tagline/motto prompt.
   - [ ] Step 3 (Value pillars): adjust copy to be customer-centric.
   - [ ] Step 4 (Audience snapshot): switch to free-text input only.
   - [ ] Step 5 (Example content): connect to existing “upload writing descriptions” flow.

4. **Prompt Integration**
   - [ ] Ensure the OpenAI system prompt references the updated semantics (tagline, audience_description, customer-centric value pillars).
   - [ ] Confirm that product descriptions change tone appropriately when the brand voice changes.

5. **QA**
   - [ ] Test new wizard from a clean install (no brand voice).
   - [ ] Test editing an existing brand voice profile.
   - [ ] Verify that no existing Thunder Text functionality breaks due to schema/API changes.
   - [ ] Confirm that Step 5 uses the existing sample-description storage and UI.

---

This revised document can be pasted directly into Claude Code as an updated project spec.  
Claude should adjust migrations, APIs, React components, and prompt logic **without breaking existing Supabase tables or flows**.
