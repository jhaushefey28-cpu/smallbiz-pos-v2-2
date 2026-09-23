/* ==========================================================================
   WEDDING SITE SETTINGS
   This is the ONLY file you need to edit to change names, dates, venues,
   colors of the schedule, FAQ, and where RSVP replies go.
   Keep the quotation marks "" and commas , exactly as they are.
   Lines starting with // are notes and are ignored.
   ========================================================================== */

window.WEDDING = {

  /* ---- 1. THE COUPLE ---------------------------------------------------- */
  partner1: "Jhau",
  partner2: "Sheila",
  familiesLine: "Together with their families",
  inviteLine: "invite you to celebrate their wedding",

  /* ---- 2. DATE AND PLACE ------------------------------------------------ */
  // Format: YYYY-MM-DDTHH:MM:SS+08:00  (+08:00 is Philippine time)
  date: "2026-12-27T15:00:00+08:00",
  dateEnd: "2026-12-27T21:00:00+08:00",   // used for "Add to calendar"
  timezone: "Asia/Manila",
  locationShort: "City, Province",         // shown on the cover under the date

  // Photo revealed by scratching the door. Put the file in the "photos"
  // folder next to this one, e.g. "photos/cover.jpg". Leave "" for the
  // monogram (your initials) instead of a photo.
  heroPhoto: "photos/cover.jpg",

  hashtag: "",                             // e.g. "#JhauAndSheila" (leave "" to hide)

  /* ---- 2b. THEME / "EXPO" ------------------------------------------------
     Pick one by name. Each shifts the whole site's color mood AND gives the
     door photo and your couple photo a matching color-grade (like a camera
     exposure/filter preset) — six to choose from:
       "classic-ivory"     - natural color, ivory & champagne gold (default)
       "golden-hour"       - warm, golden late-afternoon glow
       "romantic-blush"    - soft blush pink & rose gold
       "emerald-garden"    - deep emerald green & gold, garden-lush
       "vintage-sepia"     - classic warm sepia, old-film feel
       "midnight-silver"   - near-black & gold, moody formal-evening look
  --------------------------------------------------------------------- */
  theme: "classic-ivory",

  /* ---- 2c. DOOR PHOTO ----------------------------------------------------
     The opening "door" screen is your own photo, in the photos folder.
     Swap the file any time — same filename, or update the path below.
  --------------------------------------------------------------------- */
  doorPhoto: "photos/door-bg.jpg",

  /* ---- 3. WELCOME ------------------------------------------------------- */
  welcomeTitle: "With joyful hearts",
  welcomeMessage: [
    "We are delighted to invite you to our wedding day. Your presence would mean the world to us as we begin this next chapter surrounded by the people we love most.",
    "Please read through the details below, then send your reply so we can prepare a place for you."
  ],

  /* ---- 4. SCHEDULE ------------------------------------------------------ */
  // Delete the whole schedule block's items to hide this section: schedule: []
  scheduleTitle: "The day",
  scheduleLede: "Here is how the afternoon and evening will unfold.",
  schedule: [
    { time: "2:00 PM", title: "Guests arrive", note: "Please be seated by 2:45 PM." },
    { time: "3:00 PM", title: "Wedding ceremony", note: "" },
    { time: "4:30 PM", title: "Cocktails and photos", note: "Light refreshments while we take family photos." },
    { time: "5:30 PM", title: "Reception and dinner", note: "" },
    { time: "8:00 PM", title: "Dancing", note: "" }
  ],

  /* ---- 5. VENUES -------------------------------------------------------- */
  venuesTitle: "Where to find us",
  venuesLede: "Full addresses and map links for both celebrations.",
  venues: [
    {
      label: "Ceremony",
      name: "Name of Church",
      address: "Street address, City, Province",
      time: "3:00 PM",
      mapUrl: ""      // paste a Google Maps link, or leave "" to hide the button
    },
    {
      label: "Reception",
      name: "Name of Venue",
      address: "Street address, City, Province",
      time: "5:30 PM",
      mapUrl: ""
    }
  ],

  /* ---- 6. ATTIRE -------------------------------------------------------- */
  attireTitle: "Attire",
  attireLede: "Formal attire, in the colors of the day.",
  attireText: "We would love to see you dressed in formal wear. Barong Tagalog and Filipiniana are warmly welcome.",
  attireNote: "Kindly avoid white and ivory, which are reserved for the bride.",
  // Leave palette as [] to hide the color circles.
  palette: [
    { name: "Pine",       hex: "#2F4A3E" },
    { name: "Sage",       hex: "#9DB0A0" },
    { name: "Champagne",  hex: "#D8C9A3" },
    { name: "Dusty rose", hex: "#C9A39B" }
  ],

  /* ---- 7. PHOTO GALLERY (optional) -------------------------------------- */
  // Put photos in this folder and list them here. Leave [] to hide the section.
  // Example: { src: "photos/one.jpg", alt: "Jhau and Sheila at the beach" }
  galleryTitle: "Our story in pictures",
  photos: [],

  /* ---- 8. QUESTIONS ----------------------------------------------------- */
  faqTitle: "Good to know",
  faqLede: "Answers to the questions we hear most.",
  faq: [
    {
      q: "Who is invited?",
      a: "Your invitation lists the seats reserved for your party. If you need to change this, please contact us before the reply deadline."
    },
    {
      q: "Are children welcome?",
      a: "We love your little ones. Please include them in the number of guests when you reply."
    },
    {
      q: "Will the ceremony be unplugged?",
      a: "Yes. We kindly ask you to keep phones and cameras away during the ceremony so our photographer can capture every moment."
    },
    {
      q: "What can I give as a gift?",
      a: "Your presence is the greatest gift. If you wish to give something, a contribution to our new home is deeply appreciated."
    }
  ],
  contact: {
    name: "",     // e.g. "Sheila"
    phone: "",    // e.g. "0917 000 0000"
    email: ""     // e.g. "hello@example.com"
  },

  /* ---- 9. RSVP (how replies are collected) ------------------------------ */
  rsvp: {
    title: "Kindly reply",
    lede: "Let us know if you can join us. Your reply helps us plan seating and dinner.",
    deadline: "2026-11-27",     // YYYY-MM-DD
    maxGuests: 4,               // most guests one reply can include

    // Optional main course choices. Leave [] to skip the question.
    mealOptions: [],            // e.g. ["Beef", "Fish", "Vegetarian"]
    askSongRequest: true,

    // Choose ONE way to receive replies:
    //   "email"    - easiest. Opens the guest's email app with the reply ready.
    //   "supabase" - replies saved in your own Supabase table (see SETUP.md).
    //   "webhook"  - replies sent to a Google Sheet (see SETUP.md).
    mode: "email",

    email: "",                                  // used when mode is "email"
    supabase: { url: "", anonKey: "", table: "rsvps" },
    webhookUrl: ""                              // used when mode is "webhook"
  }
};
