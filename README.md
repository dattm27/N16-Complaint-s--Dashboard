# Consumer Complaints Dashboard

A web-based recreation of the Chapter 20 "Complaints Dashboard" style: white canvas, large teal title, KPI values that also act as the color legend, monthly stacked bars, a clickable state hex map, and split Closed/Open bar charts for complaint reason and party/company.

## Dataset

- Local file: `data/consumer_complaints.csv`
- Source: Plotly datasets, `26k-consumer-complaints.csv`
- Records: 28,156 complaints
- Date range: 2015-01-01 to 2015-03-19

Status mapping:

- `Company response = In progress` -> `Open`
- All other company response values -> `Closed`

## Dashboard Features

- Dual-handle `Date Received` slider filters the dashboard by date range.
- `Source Type` filter uses the dataset's `Product` field.
- `Show Open/Closed` filter switches between all, open-only, and closed-only complaints.
- `Complaints by Month` groups records by actual calendar month.
- State hex map shows open complaints and filters the full dashboard when a state is clicked.
- Reason and Party charts compare `Closed` and `Open` volumes side by side.
- `Reset View` restores the full dataset view.

## Run Locally

From this project folder:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/index.html
```

## Test

```bash
npm test
```

The smoke test checks that:

- The dashboard loads all 28,156 records.
- Open complaints are calculated from `In progress`.
- The monthly chart renders one bar per calendar month.
- The dual-handle date slider filters records.
- The open/closed status filter works.
- Clicking a state on the hex map filters the dashboard.
- The Source Type/Product filter narrows the dataset.
- Reset restores the full dataset.
- The mobile layout does not overflow horizontally.
- Desktop screenshot is saved to `artifacts/dashboard-smoke.png`.
- Mobile screenshot is saved to `artifacts/dashboard-mobile.png`.
