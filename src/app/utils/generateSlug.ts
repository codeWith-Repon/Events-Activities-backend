
export async function generateSlug(title: string, model: any) {
    const baseSlug = title.toLowerCase().split(" ").join("-")
    let slug = `${baseSlug}`

    let exists = await model.findUnique({ where: { slug } });

    let counter = 1;

    while (exists) {
        slug = `${baseSlug}-${counter++}`
        exists = await model.findUnique({ where: { slug } });
    }
    return slug
}