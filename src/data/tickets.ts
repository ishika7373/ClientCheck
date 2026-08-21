import type { Ticket } from "../lib/types";

/* Fallback dataset. Ticket counts here match Account.openTickets exactly, so
   the Support Tools summary and the per account metric never disagree. */
export const MOCK_TICKETS: Ticket[] = [
  { id: "TCK-4102", accountId: "ACC-1042", subject: "Dock 3 charging station fails handshake after firmware 4.2", priority: "Urgent", ageDays: 9, slaState: "Breached" },
  { id: "TCK-4104", accountId: "ACC-1043", subject: "RTK base station loses fix during shift change", priority: "Urgent", ageDays: 12, slaState: "Breached" },
  { id: "TCK-4106", accountId: "ACC-1055", subject: "Night patrol docking failure in high wind", priority: "High", ageDays: 11, slaState: "Breached" },
  { id: "TCK-4108", accountId: "ACC-1042", subject: "Thermal payload calibration drift on two airframes", priority: "High", ageDays: 6, slaState: "At Risk" },
  { id: "TCK-4111", accountId: "ACC-1082", subject: "Dust ingress warning on dock 1 after pit blast", priority: "High", ageDays: 8, slaState: "At Risk" },
  { id: "TCK-4115", accountId: "ACC-1042", subject: "Scheduled mission skips waypoint 7 intermittently", priority: "Medium", ageDays: 4, slaState: "On Track" },
  { id: "TCK-4117", accountId: "ACC-1071", subject: "Live stream latency above 4s for command vehicle", priority: "High", ageDays: 6, slaState: "At Risk" },
  { id: "TCK-4119", accountId: "ACC-1043", subject: "Perimeter geofence alerts not reaching duty phone", priority: "High", ageDays: 7, slaState: "At Risk" },
  { id: "TCK-4121", accountId: "ACC-1055", subject: "Video retention policy not applied to archived missions", priority: "Medium", ageDays: 5, slaState: "At Risk" },
  { id: "TCK-4124", accountId: "ACC-1074", subject: "Site boundary import rejects DXF from surveyor", priority: "Medium", ageDays: 4, slaState: "On Track" },
  { id: "TCK-4127", accountId: "ACC-1043", subject: "Operator roles reset after SSO directory sync", priority: "Medium", ageDays: 3, slaState: "On Track" },
  { id: "TCK-4129", accountId: "ACC-1082", subject: "Stockpile volume report differs from survey crew", priority: "Medium", ageDays: 3, slaState: "On Track" },
  { id: "TCK-4133", accountId: "ACC-1060", subject: "Track inspection mission fails pre-flight compass check", priority: "Medium", ageDays: 2, slaState: "On Track" },
  { id: "TCK-4136", accountId: "ACC-1055", subject: "Add second operator seat to shift schedule", priority: "Low", ageDays: 1, slaState: "On Track" },
  { id: "TCK-4131", accountId: "ACC-1042", subject: "Export of flight logs times out beyond a 30 day range", priority: "Low", ageDays: 2, slaState: "On Track" },
];
