// src/constants/vitalStatus.ts

export type VitalStatus = "alive" | "deceased" | "decedent";

export const VITAL_STATUS_OPTIONS: {
    value: VitalStatus;
    label: string;
    hint: string;
    badge: string;
}[] = [
    {
        value: "alive",
        label: "Alive",
        hint: "Living resident",
        badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    },
    {
        value: "deceased",
        label: "Deceased",
        hint: "Resident who has passed away",
        badge: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    },
    {
        value: "decedent",
        label: "Decedent",
        hint: "Property owner who has passed away",
        badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
];

export const getVitalStatus = (value?: string | null) =>
    VITAL_STATUS_OPTIONS.find((o) => o.value === value) ??
    VITAL_STATUS_OPTIONS[0];
