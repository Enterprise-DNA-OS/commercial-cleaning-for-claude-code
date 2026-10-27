# Switching from Swept

Bring your locations, employees and timesheet history across in an afternoon. Dry run first; nothing is kept until you run it without `--dry-run`.

## 1. Get your data out of Swept

- **Timesheets.** Swept exports approved time as payroll-ready CSV ([sweptworks.com/cleaning-company-time-tracking-app](https://sweptworks.com/cleaning-company-time-tracking-app)). Export the last few months.
- **Locations and employees.** Swept does not publish an export format for these lists. Copy them from the Locations and Employees screens into a spreadsheet, or ask Swept support for a CSV, and save each as CSV.
- **Inspections.** Swept sends inspection reports as PDF. Keep them as your history; new inspections go in with `/inspect`. Enterprise DNA can read the PDFs across for you.

## 2. Add your clients

Swept locations do not carry a client or a contract price. Add each client first:

```bash
node scripts/cleaning.mjs add-client --code=TPG --name="Tasman Property Group Ltd" --country=NZ --actor="Your name"
```

## 3. Import, in this order

```bash
node scripts/cleaning.mjs import swept locations.csv --kind=locations --client=TPG --region=NZ --actor="Your name" --dry-run
node scripts/cleaning.mjs import swept employees.csv --kind=employees --actor="Your name" --dry-run
node scripts/cleaning.mjs import swept timesheets.csv --kind=timesheets --actor="Your name" --dry-run
```

Then the same three without `--dry-run`. `examples/swept/` has a small file of each kind.

## Headings it reads

| Kind | Field | Headings tried, in order |
|---|---|---|
| locations | code | Location ID, Location Code, Site Code, Code, ID |
| | name | Location Name, Location, Name, Site |
| | client | Client, Client Name, Customer (or `--client`) |
| | region | Region, State, Province (or `--region`: NZ, NSW, VIC, QLD, SA, WA, TAS, ACT, NT) |
| | monthly fee | Monthly Fee, Contract Value, Monthly Price, Fee (or `--fee` for all, then correct each) |
| | priced hours | Budget Hours, Weekly Hours, Budgeted Hours |
| employees | code | Employee ID, Employee Number, Payroll ID, Code, ID |
| | name | Employee Name, Name, Full Name, or First Name + Last Name |
| | pay | Pay Rate, Hourly Rate, Wage |
| timesheets | employee | Employee ID, Employee, Employee Name, Name |
| | location | Location ID, Location, Location Name, Site |
| | clock in / out | Clock In, Start, Start Time, Time In / Clock Out, End, End Time, Time Out |

Your file has other headings? Write a map and pass `--map=map.json`:

```json
{ "code": "Site #", "name": "Site", "fee": "Monthly $" }
```

Dates read as `2026-10-03 18:00`, `03/10/2026 18:00` or `03/10/2026 6:00 PM` (day first).

## What comes across, what does not

- **Comes across:** locations as sites, employees as cleaners, approved timesheets as completed visits with their clock times.
- **Add after:** each site's monthly fee and priced hours if your file did not have them, floor area for Australian sites, award levels, inductions, police vets, the scope of works (`/add-task`), keys.
- **Does not come across:** checklists and inspection history (PDF), messages, GPS records, scheduled future shifts (roster them with `/add-visit --repeat`).

Imports are atomic: rows already imported are skipped, and one bad row stops the whole file with the row number.
