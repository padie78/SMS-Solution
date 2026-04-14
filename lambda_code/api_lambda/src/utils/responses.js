export const sendSuccess = (entityType) => ({
    success: true,
    message: `${entityType} saved successfully`
});

export const sendError = (error) => ({
    success: false,
    message: error.message || "Internal Server Error"
});