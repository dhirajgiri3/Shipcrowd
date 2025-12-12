/**
 * Utility functions for formatting warehouse operating hours
 */

interface OperatingHoursDay {
  open: string | null;
  close: string | null;
}

interface OperatingHours {
  monday?: OperatingHoursDay;
  tuesday?: OperatingHoursDay;
  wednesday?: OperatingHoursDay;
  thursday?: OperatingHoursDay;
  friday?: OperatingHoursDay;
  saturday?: OperatingHoursDay;
  sunday?: OperatingHoursDay;
}

/**
 * Format operating hours for display
 * @param operatingHours The operating hours object from the warehouse
 * @returns Formatted operating hours for display
 */
export const formatOperatingHours = (operatingHours?: OperatingHours): Record<string, string> => {
  if (!operatingHours) {
    return {};
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formatted: Record<string, string> = {};

  days.forEach((day) => {
    const dayHours = operatingHours[day as keyof OperatingHours];
    
    if (!dayHours || !dayHours.open || !dayHours.close) {
      formatted[day] = 'Closed';
    } else {
      formatted[day] = `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`;
    }
  });

  return formatted;
};

/**
 * Format time string (e.g., "09:00" to "9:00 AM")
 * @param timeStr Time string in 24-hour format (HH:MM)
 * @returns Formatted time string in 12-hour format with AM/PM
 */
export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return timeStr;
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    return timeStr;
  }
};

/**
 * Check if a warehouse is open on a specific day
 * @param operatingHours The operating hours object from the warehouse
 * @param day The day to check (monday, tuesday, etc.)
 * @returns True if the warehouse is open on the specified day
 */
export const isOpenOnDay = (operatingHours: OperatingHours | undefined, day: string): boolean => {
  if (!operatingHours) return false;
  
  const dayHours = operatingHours[day as keyof OperatingHours];
  return !!(dayHours && dayHours.open && dayHours.close);
};

export default {
  formatOperatingHours,
  formatTime,
  isOpenOnDay,
};
