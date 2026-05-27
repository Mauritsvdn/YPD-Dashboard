# Workflow

- After pushing changes to a feature branch, always merge that branch into `main` and push `main`. The production Vercel deployment (`ypd-dashboard.vercel.app`) tracks `main`, so changes only go live after a merge.
