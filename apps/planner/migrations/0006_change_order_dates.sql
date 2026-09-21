-- Give change orders real dates.
--
-- Until now a change order carried only cost and schedule-days impact, with no
-- date anywhere on the record. That meant COs could never appear in the
-- calendar, the lookaheads, or any day view — the one tracker whose items were
-- invisible on the schedule. `submitted` is when the pricing went out;
-- `decision_due` is the date we need an answer by before the change starts
-- costing the job float.
alter table change_orders add column if not exists submitted date;
alter table change_orders add column if not exists decision_due date;
create index if not exists change_orders_decision_due_idx on change_orders (decision_due);
