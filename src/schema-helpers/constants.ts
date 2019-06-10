export const deleted = { deleted: { $in: [true, false] } };
export const notDeleted = { deleted: { $ne: true } };
