export function sanitizeUser<T extends Record<string, any>>(obj: T, fieldsToRemove: (keyof T)[]): Omit<T, keyof T> {
    const newObj = { ...obj };
    fieldsToRemove.forEach((field) => {
        if (field in newObj) {
            delete newObj[field];
        }
    });
    return newObj;
}
