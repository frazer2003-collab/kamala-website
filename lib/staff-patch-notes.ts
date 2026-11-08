export type StaffPatchNote = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  /** One-line blurb for Home. */
  summary: string;
  changes: string[];
  /** Small UI crop under the note, served from /public. */
  image: {
    src: string;
    alt: string;
  };
};

/**
 * Newest first. Add a new entry at the top when shipping staff-facing work.
 */
export const STAFF_PATCH_NOTES: StaffPatchNote[] = [
  {
    id: "2026-11-08-all-bookings-desk",
    date: "2026-11-08",
    title: "All bookings matches Bills desk list",
    summary:
      "All bookings uses the Bills date strip and table. Newest bookings first, with stay dates and full guest detail on tap.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "All bookings desk list with stay and booked dates",
    },
    changes: [
      "All bookings uses the same Today / This week / This month strip as Bills and Expenses.",
      "List defaults to most recently booked first; stay dates, room, payment, and status stay on each row.",
      "Tap a row for phone, email, source, and Open on calendar.",
    ],
  },
  {
    id: "2026-11-08-nav-laundry-trips",
    date: "2026-11-08",
    title: "Nav rename, Messages, laundry paid/received, Trips",
    summary:
      "Stay items sit with Home. F&B / Pending payments / All bookings. Messages list, laundry unpaid-paid with receive, Trips & Tours sales.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff navigation and desk lists",
    },
    changes: [
      "Stay group removed — Pending payments, Calendar, All bookings, and Messages sit under Home.",
      "Desk is Other income: F&B (food icon), Laundry, Menu, Expenses, Trips & Tours.",
      "Messages lists guest threads newest-first and flags unanswered chats.",
      "Laundry slips use Unpaid/Paid, a price, sent and received dates, plus a Received button on open slips.",
    ],
  },
  {
    id: "2026-11-07-fluid-invocations",
    date: "2026-11-07",
    title: "Quieter Bills and Calendar server load",
    summary:
      "Bills no longer auto-refreshes every few seconds. Calendar empty-day taps open without reloading the whole board.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff calendar and bills desk",
    },
    changes: [
      "Bills stopped polling the server every 4 seconds while the list is open.",
      "Tapping an empty calendar day opens the day dialog on the client — no full calendar reload.",
    ],
  },
  {
    id: "2026-11-07-sheets-ota-transfers",
    date: "2026-11-07",
    title: "Sheet item counts, OTA Paid, quieter Transfers",
    summary:
      "Sheets laundry uses duvet / pillowcase quantities. OTA Paid skips Cash/Thai bank. Transfers no longer shows a closed archive placeholder.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Laundry sheets item quantities and Transfers open inbox",
    },
    changes: [
      "Choosing Sheets on Laundry opens a qty list for duvet covers, sheets, pillow cases, and towels.",
      "Airbnb / Booking.com / Expedia stays marked Paid no longer ask for Cash or Thai bank — they count as card.",
      "Transfers dropped the closed archive list; refunds stay in the open inbox when money is due.",
      "Transfers auto-opens only a row from the visible filter, and Bank check includes refunds and unverified transfers.",
      "Staff nav no longer prefetches every page in the background (cuts Vercel Fluid CPU from sidebar hover loads).",
    ],
  },
  {
    id: "2026-11-07-bills-date-range",
    date: "2026-11-07",
    title: "Bills use the same date range as Expenses",
    summary:
      "Today / This week / This month and the date strip filter bills. The footer shows bill count and range total.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bills list with date range controls and range total footer",
    },
    changes: [
      "Bills defaults to Today and shares the Expenses range chrome.",
      "Footer shows how many bills are in range and the money total.",
      "Expenses footer now shows count the same way for a consistent desk pattern.",
    ],
  },
  {
    id: "2026-11-07-desk-list-fill",
    date: "2026-11-07",
    title: "Desk lists fill the screen; Actions holds the rest",
    summary:
      "Bills, Laundry, Menu, and Expenses give the table the viewport. New / receive / categories live under Actions. Menu and Stock share tabs on one page.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Full-height desk table with Actions menu",
    },
    changes: [
      "Each desk list grows to fill the view with a sticky header row while you scroll.",
      "Create and secondary tools sit behind Actions — Add expense, receive stock, meals left, projections.",
      "Menu uses Menu / Stock tabs so one catalog list owns the screen at a time.",
    ],
  },
  {
    id: "2026-11-07-menu-stock-merged",
    date: "2026-11-07",
    title: "Menu holds sellables and stock; laundry left the catalog",
    summary:
      "Stock lives under Menu with sellables. Guest laundry is no longer a menu category — use Laundry / Expenses. Desk pages fill the screen with even padding.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Menu page with sellable list and stock table together",
    },
    changes: [
      "Guest laundry is removed from Menu categories and item setup.",
      "Counted stock (receive, waste, adjust) sits on the same Menu page as sellables; /staff/stock redirects there.",
      "Bills, Laundry, Menu, and Expenses use full-width desk layout with matching page padding.",
    ],
  },
  {
    id: "2026-11-07-desk-lists-like-bills",
    date: "2026-11-07",
    title: "Laundry, stock, expenses, and menu lists match Bills",
    summary:
      "Record lists use the same full-width table as Bills — click a row to open, Add in the toolbar, empty states with a clear button.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Desk bills-style record table with clickable rows",
    },
    changes: [
      "Laundry no longer uses a side create form — Add slip opens a dialog; the list matches Bills.",
      "Stock counted items are a full-width table; receive/adjust sits under the list.",
      "Expenses are one flat table with Date (no day sections); Menu empty state matches Bills.",
    ],
  },
  {
    id: "2026-11-07-desk-usability-rev4",
    date: "2026-11-07",
    title: "Portal laundry and sidebar speak TH",
    summary:
      "Sheets portal title, intro, and Sign out follow staff language — same idea as the bills portal.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Laundry portal header in Thai with Sheets sidebar",
    },
    changes: [
      "Laundry portal header uses Thai when the staff language is TH.",
      "Portal sidebar Sheets / Bills and Log out follow EN/TH.",
      "Quiet save errors show a bilingual Could not save message.",
    ],
  },
  {
    id: "2026-11-07-desk-usability-rev3",
    date: "2026-11-07",
    title: "New bills name themselves in Thai; busy controls stay honest",
    summary:
      "A new bill defaults to บิลใหม่ in TH. While one save runs, sibling buttons wait without fake Adding… labels.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bill dialog with Save waiting while Add finishes",
    },
    changes: [
      "New bill default name follows staff language (New bill / บิลใหม่).",
      "On an open tab, only the control that is saving shows a pending label; others just wait.",
      "Portal bills header and expense/laundry Saving… copy follow EN/TH.",
    ],
  },
  {
    id: "2026-11-07-desk-usability-rev2",
    date: "2026-11-07",
    title: "Bill tab won’t double-save; Date speaks TH",
    summary:
      "Rename and Add on a bill wait for each other. Empty-state New bill matches the header. Date and Opening/Adding follow EN/TH.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Open bill dialog with Save and Add that take turns",
    },
    changes: [
      "While one bill action is saving, the other Save / Add / Clear controls wait — no overlapping refreshes.",
      "Empty-list New bill opens the same way as the header button.",
      "Bills Date column and Opening… / Adding… labels follow the staff language.",
    ],
  },
  {
    id: "2026-11-07-laundry-expense-split",
    date: "2026-11-07",
    title: "Laundry tracks bags; laundromat invoices go to Expenses",
    summary:
      "New laundry slips stay on the list. When the laundromat bill arrives, key it under Expenses.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Laundry page with link to Expenses for the laundromat bill",
    },
    changes: [
      "Adding a laundry slip no longer pops a dialog — the list updates and you keep working.",
      "Laundry intro points vendor invoices to Expenses; a quiet link opens Today’s expenses.",
      "Expense charge examples now include laundry alongside electricity and water.",
    ],
  },
  {
    id: "2026-11-07-desk-usability-rev1",
    date: "2026-11-07",
    title: "New bill opens right away; Expenses starts on Today",
    summary:
      "Header New bill opens the tab again. Expenses under Desk lands on Today.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "New bill dialog open after pressing New bill",
    },
    changes: [
      "New bill from the header opens the live tab immediately.",
      "Expenses opens on Today; dialogs focus the first field so you can type straight away.",
    ],
  },
  {
    id: "2026-11-07-desk-quiet-saves",
    date: "2026-11-07",
    title: "Faster desk saves — no full-screen wait",
    summary:
      "Bills, stock, laundry, menu, and expenses save with a button spinner only. Expenses moved under Desk.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Desk bill dialog with quick add line",
    },
    changes: [
      "Adding lines, saving slips, and recording expenses no longer flash the full Saving screen.",
      "Only the Save / Add button shows a short pending state; the list refreshes when done.",
      "Expenses sits under Desk with Bills, Stock, Laundry, and Menu.",
    ],
  },
  {
    id: "2026-11-07-expenses-gross-profit",
    date: "2026-11-07",
    title: "Expenses page and Finance gross profit",
    summary:
      "Record business expenses by day/week/month with a running total. Finance shows gross profit from room revenue, bill sales, expenses, and food/drink cost.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Expenses list with range total and Finance gross profit panel",
    },
    changes: [
      "New Expenses page under Desk — charge name, cost, optional note.",
      "Browse Today / This week / This month or any date range; sticky total at the bottom.",
      "Finance adds Gross profit: room revenue + cleared bills − expenses − item cost on cleared bills.",
      "Demo expense records are seeded so you can try the views immediately.",
    ],
  },
  {
    id: "2026-11-07-catalog-setup",
    date: "2026-11-07",
    title: "Cost, sell price, custom units, and stock projections",
    summary:
      "Menu and stock ask for cost and sell price. Units and categories are yours to set. Stock shows projections instead of raw movement history. Bill lines can be priced at 0 for owner use.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Menu item setup with cost and sell price fields",
    },
    changes: [
      "Creating menu or stock items asks for cost and sell price.",
      "Stock units are free text (ml, L, pack, bottle…) with suggestions.",
      "Categories are managed on Menu items — add your own for the guesthouse.",
      "Stock projections replace recent movements (14-day sales pace).",
      "On a bill, change any line’s unit price (including 0) — stock still cuts on clear.",
    ],
  },
  {
    id: "2026-11-07-desk-copy-controls",
    date: "2026-11-07",
    title: "Clearer desk status and empty lists",
    summary:
      "Status labels show in EN/TH, tiny dropdowns use simple menus, and empty laundry/stock match the bills empty pattern. Busy Today rises into Needs attention.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Desk laundry and stock empty states with Add slip and Add counted item",
    },
    changes: [
      "Bill and laundry status (and laundry category) show as Open/Cleared and Sent/Incomplete/Complete instead of raw codes.",
      "Category, status, reason, and unit use a normal select — search combo stays for picking items.",
      "Empty laundry and counted-stock lists show a title, hint, and primary Add button.",
      "Today moves into Needs attention when there are arrivals or departures.",
    ],
  },
  {
    id: "2026-11-07-desk-acted-by",
    date: "2026-11-07",
    title: "Stock movements show who recorded them",
    summary:
      "Recent stock movements can show who recorded them (staff email or bills portal).",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Stock recent movements list with actor label",
    },
    changes: [
      "Clearing a bill and recording stock now save who did it for later review.",
      "Recent movements on Stock show the actor next to the note when available.",
    ],
  },
  {
    id: "2026-11-07-desk-nav-dialogs",
    date: "2026-11-07",
    title: "Sidebar Money / Site and steadier bill popups",
    summary:
      "Home sits above Stay; Money and Site are separate. Bill dialogs keep Clear visible and trap focus; laundry portal says Sheets.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff sidebar with Home above Stay and Money Site groups",
    },
    changes: [
      "Sidebar: Home above Stay; Money (Finance, Discounts) and Site (Gallery, AI, Settings) are separate groups.",
      "Portal shortcuts left Home; open them from the portal login URL when needed.",
      "Laundry portal brand line says Sheets; bill dialogs keep the footer on screen with Tab trapped inside.",
      "Item search options are taller for finger taps on shared tablets.",
    ],
  },
  {
    id: "2026-11-07-home-attention-lists",
    date: "2026-11-07",
    title: "Home lists what needs attention",
    summary:
      "Open bills, laundry slips, low stock, missing doors, and Transfers each show as clickable rows on Home.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff Home with Needs attention lists for bills and other desk work",
    },
    changes: [
      "Needs attention shows every hot area, not only the top three cards.",
      "Each open bill is a row that opens that tab on Bills.",
      "Laundry, stock, doors, and Transfers rows open the matching record or inbox item.",
    ],
  },
  {
    id: "2026-11-07-desk-money-integrity",
    date: "2026-11-07",
    title: "Stock prices on bills and safer portals",
    summary:
      "Selling stock on a bill asks for a baht price. Clear warns when lines have no recipe. Desk portals sign out when idle.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bill popup with stock price field and clear warning",
    },
    changes: [
      "Adding a stock item to a bill requires a baht price the first time (no silent ฿50).",
      "Clear bill warns if any lines have no recipe and will not cut stock.",
      "Bills and laundry portals use a shorter session and the same idle sign-out as full staff.",
    ],
  },
  {
    id: "2026-11-07-bill-item-pick",
    date: "2026-11-07",
    title: "Bill item pick shows the chosen name",
    summary:
      "Choosing an item on a bill keeps the name in the field so you can see what you picked before Add.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Bill popup with selected item name in the add field",
    },
    changes: [
      "Add item keeps the selected name visible until you press Add.",
      "The item list no longer sits under the dialog or collapses when you pick.",
    ],
  },
  {
    id: "2026-11-07-desk-trust-slice",
    date: "2026-11-07",
    title: "Safer clear bill and clearer open tabs",
    summary:
      "Clearing a bill asks for confirm and won’t run on an empty tab. Home shows open-tab baht at risk.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff bill clear confirm with total and stock note",
    },
    changes: [
      "Clear bill is two steps: review guest, total, and stock note, then confirm.",
      "Empty open tabs cannot be cleared — add items first.",
      "The bills list pauses live refresh while a bill popup is open so typing is not interrupted.",
      "Home Bills card shows open count, baht total, and oldest age — not “to clear.”",
    ],
  },
  {
    id: "2026-11-07-combo-above-fold",
    date: "2026-11-07",
    title: "Bill item search stays on screen",
    summary:
      "The Add item dropdown no longer drops under the dialog edge; it opens where there is room.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff bill popup with item search list visible on screen",
    },
    changes: [
      "Desk search lists float above the page and flip upward when space below is tight.",
    ],
  },
  {
    id: "2026-11-07-live-bills",
    date: "2026-11-07",
    title: "New bill opens a live tab",
    summary:
      "Pressing New bill creates the open tab immediately. Items save to that bill as you add them so the desk stays accurate.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff desk bills list with an open live tab",
    },
    changes: [
      "New bill creates an open tab right away and opens it for naming and items.",
      "Each add or remove updates the bill record immediately for anyone on Bills.",
      "The bills list refreshes every few seconds so the desk sees open tabs and lines live.",
    ],
  },
  {
    id: "2026-11-07-desk-portals-home",
    date: "2026-11-07",
    title: "Menu items, desk portals, and priority Home",
    summary:
      "Home leads with what needs attention. Bills and laundry have portal logins, and stock can be sold on bills.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff home priority cards and desk tools",
    },
    changes: [
      "Items is renamed to Menu items in the sidebar and desk tools.",
      "Home puts Transfers, doors, low stock, open laundry, and open bills first when they need attention.",
      "Whole record rows open the popup, not only the name link.",
      "Laundry notes can be edited in the slip popup.",
      "Bills can add stock items as well as menu items; clearing a bill posts stock movements again.",
      "Desk portals at /staff/portal/login for bills and sheets-only laundry.",
      "Search dropdowns keep showing matching options while you type.",
    ],
  },
  {
    id: "2026-11-07-desk-speed-th",
    date: "2026-11-07",
    title: "Faster desk tools and Thai staff language",
    summary:
      "Desk lists open in popups, search picks items with Enter, and EN/TH switches the whole staff site.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Staff desk bills popup with searchable item picker",
    },
    changes: [
      "Desk dropdowns are typeable: search, Enter to choose, then the field clears for the next pick.",
      "Laundry uses one measure field that follows Type (kilograms or piece count).",
      "Items recipes use a search list to add ingredients quickly.",
      "Clicking a laundry, stock, bill, or catalog record opens a popup instead of reloading the page.",
      "An EN/TH button in the sidebar translates staff navigation and page wording.",
    ],
  },
  {
    id: "2026-11-07-reservations-sort-filter",
    date: "2026-11-07",
    title: "Reservations shows booked date and sortable columns",
    summary:
      "Each stay shows when it was booked. Click a column to sort, and filter by room or payment.",
    image: {
      src: "/staff/patch-notes/reservations-sort.jpg",
      alt: "Reservations table with Booked column and sortable headers",
    },
    changes: [
      "A Booked column shows the Bangkok calendar day the stay was created.",
      "Every column sorts ascending or descending from the header.",
      "Room and Payment filters sit with Find and the date range.",
    ],
  },
  {
    id: "2026-11-07-desk-operations",
    date: "2026-11-07",
    title: "Bills, stock, laundry, and desk items",
    summary:
      "The Desk section now keeps guest tabs, stock counts, laundry slips, prices, and recipes together.",
    image: {
      src: "/staff/patch-notes/desk-ops.jpg",
      alt: "Kamala staff Desk pages for bills, stock, laundry, and sellable items",
    },
    changes: [
      "Bills keeps open guest tabs, adds catalog items, totals in baht, and deducts recipe stock when a bill is cleared.",
      "Stock puts the shortest headroom first, estimates meals left, and records purchases, waste, and count corrections.",
      "Laundry records bags or piece counts and opens a simple slip for return status.",
      "Items manages Thai and English names, baht prices, categories, recipes, and laundry attached to room items.",
      "The sidebar groups Stay, Desk, and Money & site so the new tools stay easy to find.",
    ],
  },
  {
    id: "2026-11-07-reservations-in-house",
    date: "2026-11-07",
    title: "Reservations shows who is actually here",
    summary:
      "The list includes stays that overlap the dates, and you can find a guest by name, door, or phone. Payment says paid, unpaid, no charge, or no price.",
    image: {
      src: "/staff/patch-notes/reservations-ledger.jpg",
      alt: "Reservations table with guest, stay, room number, source, and payment",
    },
    changes: [
      "A date range now lists every stay that occupies a night in it, including guests who checked in earlier.",
      "Find searches name, door number, and phone. In house today jumps to whoever is staying tonight.",
      "Each row shows nights, room and door, and whether the stay is paid, unpaid, a no-charge stay, or an OTA stay with no price.",
      "The guest name opens that stay on the calendar. Channel rows show the room type instead of repeating the channel name.",
    ],
  },
  {
    id: "2026-11-07-home-desk-spacing",
    date: "2026-11-07",
    title: "Home desk spacing",
    summary:
      "Today's work sits in one row. Reservations and Finance are quieter links underneath, and patch notes follow.",
    image: {
      src: "/staff/patch-notes/home-spacing.jpg",
      alt: "Staff Home with Transfers, today, and Calendar in one row, then shorter Reservations and Finance links",
    },
    changes: [
      "Transfers, today, and Calendar stay in one row and hug their text instead of stretching into tall empty cards.",
      "Reservations and Finance sit on a shorter second row so they do not compete with live work.",
      "The latest patch note sits under the desk, not above it.",
    ],
  },
  {
    id: "2026-11-07-park-door-for-swap",
    date: "2026-11-07",
    title: "Park a stay to swap doors",
    summary:
      "Clear a door number to move stays around. The night stays sold, so guests cannot book the gap.",
    image: {
      src: "/staff/patch-notes/park-door.jpg",
      alt: "Room number set to Unassigned, hold for a swap",
    },
    changes: [
      "Room number includes Unassigned, hold for a swap. Saving it, or dropping the bar on No #, clears the door.",
      "The empty door can take another stay so you can finish a swap.",
      "A parked stay still holds one sellable door. The website, a new booking, and a guest date change will not take that night.",
    ],
  },
  {
    id: "2026-11-07-ota-cancel-skips-transfers",
    date: "2026-11-07",
    title: "OTA cancels skip Transfers",
    summary:
      "Airbnb, Booking.com, and Expedia cancels close the stay. The channel refunds the guest, so nothing is queued.",
    image: {
      src: "/staff/patch-notes/ota-cancel.jpg",
      alt: "Airbnb cancel confirmation saying nothing is sent to Transfers",
    },
    changes: [
      "A saved Airbnb, Booking.com, or Expedia source cancels like cash: the stay closes and Transfers is not opened.",
      "Cancel & refund is hidden for those sources, including when a card is on the booking. The channel refunds the guest.",
      "Website, walk-in, card, and Thai bank cancels are unchanged.",
    ],
  },
  {
    id: "2026-11-04-finance-capacity-comps",
    date: "2026-11-04",
    title: "Finance: true capacity and stay totals",
    summary:
      "October shows 279 nights available (9 doors × 31 days). Money uses the saved stay total — a total of 0 is left out.",
    image: {
      src: "/staff/patch-notes/finance-capacity.jpg",
      alt: "Finance occupancy showing 248 of 279 nights available for October",
    },
    changes: [
      "Available nights follow the door chart: Superior 4, Deluxe 3, Family 1, Family GF 1 — so October is 279, not a phantom tenth door.",
      "Occupancy copy shows sold of available nights (for example 248 of 279).",
      "Finance money, averages, and accounts use only stay totals above 0.",
      "A stay total of 0 (owner stay or giveaway) still occupies the door for occupancy, but does not enter earned money.",
    ],
  },
  {
    id: "2026-11-04-calendar-door-drag",
    date: "2026-11-04",
    title: "Drag bookings between doors",
    summary:
      "Drag a stay onto another door to reassign it, or onto a replaceable stay to swap or take that door.",
    image: {
      src: "/staff/patch-notes/door-drag.jpg",
      alt: "Dragging a stay from one door row onto another",
    },
    changes: [
      "Drag a booking bar onto an empty door row to assign that number (same room type only).",
      "Drop onto another booking when it is replaceable: swap doors if both fit, otherwise take the door and move the other stay to No #.",
      "Drop onto No # to clear a door assignment.",
      "Channel blocks stay put — only staff-managed bookings drag.",
    ],
  },
  {
    id: "2026-11-04-paid-cash-or-bank",
    date: "2026-11-04",
    title: "Mark Paid: Cash or Thai bank",
    summary:
      "Ticking Paid on a stay now asks Cash or Thai bank so cancel and refunds follow the right rail.",
    image: {
      src: "/staff/patch-notes/paid-cash-bank.jpg",
      alt: "Paid checkbox with Cash and Thai bank options",
    },
    changes: [
      "Booking details and new bookings: when you tick Paid, choose Cash or Thai bank before saving.",
      "Stay header shows Paid · Cash, Paid · Thai bank, or Paid · Card.",
      "Cash Cancel closes the stay without sending work to Transfers — refund the guest in cash if needed.",
      "Thai bank Cancel & refund still opens Transfers and emails staff; Stripe card stays refund immediately.",
    ],
  },
  {
    id: "2026-11-04-cancel-refund-rails",
    date: "2026-11-04",
    title: "Cancel & refund by payment type",
    summary:
      "Paid stays only show Cancel & refund — Stripe refunds now; Thai bank waits on Transfers with a staff email.",
    image: {
      src: "/staff/patch-notes/cancel-refund.jpg",
      alt: "Cancel and refund confirmation with Stripe refund button",
    },
    changes: [
      "Paid stays show Cancel and Cancel & refund side by side (cash shows Cancel only).",
      "Cancel & refund: Stripe refunds the card now; Thai bank opens Transfers and emails staff that a refund is waiting.",
      "Cancel alone closes the stay and opens Transfers for a later refund — no automatic Stripe refund.",
      "Unpaid Cancel deletes the stay from the system so staff can rebook cleanly (not kept as cancelled history).",
    ],
  },
  {
    id: "2026-11-04-home-desk",
    date: "2026-11-04",
    title: "Staff Home desk overview",
    summary:
      "Home shows live Transfers work, today in/out, and stays missing a door #.",
    image: {
      src: "/staff/patch-notes/home-desk.jpg",
      alt: "Staff Home cards for Transfers, today, and door numbers",
    },
    changes: [
      "Home cards pull live Transfers breakdown (replies, bank checks, refunds, stay changes).",
      "Today at a glance: arrivals, departures, and guests in-house.",
      "Calendar card counts upcoming stays that still need a door number.",
      "Finance card points refunds back to Transfers instead of promising them there.",
      "Sidebar: collapsible rail with icons; fixed no-entry cursor on link labels.",
      "Login lands on Staff Home.",
      "Requests renamed to Transfers with honest Thai-bank copy.",
    ],
  },
];

export function getLatestStaffPatchNote() {
  return STAFF_PATCH_NOTES[0] ?? null;
}

export function formatStaffPatchDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
