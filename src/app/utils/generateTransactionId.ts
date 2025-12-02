
export function generateTransactionId(length = 8, prefix = "Tnx") {

    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";

    const categories = [upperCaseChars, lowerCaseChars, numbers];

    let result = "";

    for (let i = 0; i < length; i++) {
        const randomCategory = categories[Math.floor(Math.random() * categories.length)]

        const randomIndex = Math.floor(Math.random() * randomCategory!.length)
        const randomChar = randomCategory![randomIndex]

        result += randomChar
    }

    return `${prefix}-${result}`
}
