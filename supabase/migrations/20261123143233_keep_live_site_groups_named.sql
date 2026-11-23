-- The live site's group screen (before the next-steps screens) doesn't say
-- which report privacy a new group uses, and it shows names. With the default
-- at group-only (20261120100629_next_steps_for_trials), a group made there
-- would quietly lose its names once the next-steps screens go live, and
-- couldn't switch back after kids had checked in. The next-steps screens
-- always send a choice (group-only unless the leader picks leader support),
-- so the default only matters for the old screen: back to leader support.
alter table public.groups alter column report_privacy set default 'leader_support';

-- No group needed moving back: on 2026-11-23, before this ran, no group had
-- been made since 2026-11-20, and every group was already leader support.
