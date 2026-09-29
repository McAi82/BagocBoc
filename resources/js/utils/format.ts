// utils/format.ts

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};

export const formatTimeAgo = (date: string | Date): string => {
  if (!date) return "N/A";
  try {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  } catch {
    return "N/A";
  }
};


export const getStatusColor = (status: string): string => {
  if (!status) return "bg-theme-background text-theme-textSecondary";

  const colors: Record<string, string> = {
    // Clearance statuses
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    released: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    ready_for_release: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",

    // User statuses
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",

    // Payment statuses
    paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",

    // Certification statuses
    "in review": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "ready for release": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",

    // Front Desk
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    forwarded: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",

    default: "bg-theme-background text-theme-textSecondary",
  };

  const key = status.toLowerCase();
  return colors[key] || colors.default;
};
