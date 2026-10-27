# Why there is no front end

Swept is a database with a subscription. Underneath it are ordinary records: sites, cleaners, shifts, checklists, inspections. What you pay for, by the location, is the layer on top that lets people who do not write queries get at them.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, say what you want ("who can cover Hana tomorrow morning?", "which sites lost money last month?") and it runs the right command and explains the answer.

## What you gain

- **Answers the dashboard never had.** Margin by site against the hours the price was built on. Complaints per 100 hours worked. Periodicals that are late and the hours they owe.
- **No location bands.** Win your fifty-first site and nothing changes.
- **Your records in your own Postgres.** Back them up, query them from anything, leave any time.
- **The rules built in.** The award's minimum engagement, award rates, the New Zealand right to transfer, notifiable events.

## What a screen gives that this does not

- **A phone app for cleaners.** Clock-in with GPS, checklists on site, photos of faults. Here a supervisor records clock times, or they come in from your timesheet export.
- **Offline use** in a basement plant room.
- **A client portal** where the client logs in to see inspections.
- **Drag and drop** on a roster board.

If your cleaners need an app all day, keep one, or have Enterprise DNA build one on top of these records. If the office needs answers more than screens, this is cheaper and yours.

Installed and run for you: https://enterprisedna.co/omni/instead-of/swept
