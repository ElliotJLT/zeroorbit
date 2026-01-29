
# Chat UX Enhancement Plan

## Overview
This plan focuses on making the chat exchange more engaging and rewarding without switching to DaisyUI. We'll implement 5 key improvements incrementally, prioritizing changes that enhance the tutoring experience while preserving the existing Shadcn/Radix architecture.

---

## Phase 1: Proactive Tutor Greeting (Empty State)

**Current State:** Generic sparkles icon with "Ready to help!" text

**New Design:** 
- Show the tutor avatar (already exists at `src/assets/tutor-avatar.png`)
- Conversational greeting: "Hey! What are you working on?"
- Subtle animation to feel welcoming, not static

**Technical Changes:**
- `src/components/ChatView.tsx` - Replace the empty state section (lines 237-245)
- Import tutor avatar and add avatar image with glow effect
- Update copy to match the friendly tone

---

## Phase 2: Completion Delight (Beyond Confetti)

**Why Not Confetti:** Feels gimmicky and disconnected from the learning context. A-Level students are 16-18; they want to feel smart, not patronized.

**New Approach - "Mastery Moment":**
When `isCorrect === true`, trigger a multi-part celebration that feels earned:

1. **Visual Transformation:**
   - The correct message bubble gets a subtle green glow/pulse
   - A "Nice work" badge appears with a checkmark (already have the `isCorrect` ring styling)

2. **Momentum Acknowledgment:**
   - Show how many exchanges it took: "Solved in 3 exchanges"
   - This reinforces that working through the steps was valuable

3. **Forward Momentum:**
   - Immediate action buttons: "Try similar" / "See another approach?"
   - Already partially exists in the data model (`showSeeAnotherApproach`)

4. **Optional Subtle Animation:**
   - A quick "glow ripple" on the mint accent color that fades
   - No particles, no noise - just a satisfying visual confirmation

**Technical Changes:**
- `src/index.css` - Add `@keyframes success-glow` animation
- `src/components/ChatView.tsx` - Create a `CorrectBadge` component that appears when `message.isCorrect`
- Track exchange count in the conversation to show "Solved in X exchanges"
- Add action buttons for next steps

---

## Phase 3: Session Momentum Indicator

**Purpose:** Show the student they're making progress within this problem, not just chat length.

**Design:**
- Subtle dot indicator at the top of chat area
- Dots fill/glow as the conversation progresses
- Color shift: neutral to mint to green as they approach solution
- Keep it minimal - this is ambient awareness, not a game

**Implementation:**
```text
┌─────────────────────────────┐
│  ● ● ● ○ ○   Making progress │
└─────────────────────────────┘
```

**Technical Changes:**
- `src/components/ChatView.tsx` - Add `MomentumIndicator` component
- Calculate exchange count from messages array
- Apply appropriate styling based on progress

---

## Phase 4: Mode Toggle in Active Session

**Current State:** Mode selected in QuestionReviewScreen, then locked for the session

**New Design:**
- Show current mode (Coach/Check) as a subtle indicator in the chat
- Allow switching mid-session via a toggle
- Mode switch sends context to the AI so it adjusts behavior

**Placement Options:**
1. Small pill toggle below the header 
2. Accessible via a tap on the momentum indicator

**Technical Changes:**
- `src/components/ChatView.tsx` - Add mode state and toggle UI
- `src/hooks/useChat.ts` - Add `currentMode` state and `setMode` function
- Pass mode to edge function calls

---

## Phase 5: Friendlier Copy Pass

**Tone Updates:**

| Current | New |
|---------|-----|
| "Type your question..." | "What are you stuck on?" |
| "Ready to help!" | "Hey! What are you working on?" |
| "Submit" | "Send" (already correct) |
| Generic loading | Contextual: "Thinking..." |

**Technical Changes:**
- `src/components/ChatView.tsx` - Update placeholder text
- Update loading states to be more conversational

---

## Implementation Order (Incremental)

**Batch 1 - Quick Wins (Low Risk)**
1. Proactive greeting (empty state)
2. Friendlier copy pass

**Batch 2 - Core Experience**
3. Completion delight (mastery moment)
4. Session momentum indicator

**Batch 3 - Power Feature**
5. Mode toggle in active session

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ChatView.tsx` | Empty state, momentum indicator, completion badge, mode toggle, copy updates |
| `src/hooks/useChat.ts` | Add mode state, exchange counting |
| `src/index.css` | Success glow animation, momentum dot styles |

---

## What We're NOT Changing

- No DaisyUI migration (preserves 49 existing Shadcn components)
- No changes to edge functions or AI prompts
- No changes to routing or authentication
- Voice session logic stays intact
- PDF handling unchanged

---

## Success Criteria

After implementation, verify:
1. Empty state shows tutor avatar with proactive greeting
2. Correct answers trigger the mastery moment UI (no confetti)
3. Momentum dots appear and progress as conversation flows
4. Mode can be switched mid-session
5. All copy feels friendly, not formal
6. Test on mobile - all touch targets remain 44px+
