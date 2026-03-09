import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { DEFAULT_MARKETING_SLIDES } from '../../../frontend/data/marketing-slides'
import { DEFAULT_HOME_TESTIMONIALS, DEFAULT_HOME_TESTIMONIALS_TITLE } from '../../../frontend/data/home-page-defaults'

async function main() {
  const payload = await getPayload({ config })

  const current = await payload.findGlobal({
    slug: 'home-page',
    depth: 0,
  })

  const currentAbout = typeof current?.aboutSection === 'object' && current.aboutSection ? current.aboutSection : null
  const currentTestimonials =
    typeof current?.testimonialsSection === 'object' && current.testimonialsSection
      ? current.testimonialsSection
      : null
  const currentBlogSection =
    typeof current?.blogSection === 'object' && current.blogSection ? current.blogSection : null
  const aboutSection = {
    title:
      typeof currentAbout?.title === 'string' && currentAbout.title.length > 0
        ? currentAbout.title
        : 'O obchodě Lumera',
    description:
      typeof currentAbout?.description === 'string' && currentAbout.description.length > 0
        ? currentAbout.description
        : 'Lumera je český obchod s italskými koženými kabelkami a doplňky.\nSpolupracujeme s menšími výrobci z Itálie, kteří si zakládají na kvalitě a ručním zpracování. Každý model pečlivě vybíráme tak, aby spojoval eleganci, praktičnost a originalitu. Věříme, že krása je v detailu - stejně jako v každé kabelce, kterou nabízíme.',
    buttonText:
      typeof currentAbout?.buttonText === 'string' && currentAbout.buttonText.length > 0
        ? currentAbout.buttonText
        : 'Zjistit více o obchodě',
    buttonLink:
      typeof currentAbout?.buttonLink === 'string' && currentAbout.buttonLink.length > 0
        ? currentAbout.buttonLink
        : '/o-nas',
  }
  const testimonialItems =
    Array.isArray(currentTestimonials?.items) && currentTestimonials.items.length > 0
      ? currentTestimonials.items
      : DEFAULT_HOME_TESTIMONIALS
  const testimonialsSection = {
    title:
      typeof currentTestimonials?.title === 'string' && currentTestimonials.title.length > 0
        ? currentTestimonials.title
        : DEFAULT_HOME_TESTIMONIALS_TITLE,
    items: testimonialItems,
  }
  const blogSection = currentBlogSection
    ? {
        title:
          typeof currentBlogSection.title === 'string' && currentBlogSection.title.length > 0
            ? currentBlogSection.title
            : 'Z blogu Lumera',
        description:
          typeof currentBlogSection.description === 'string' && currentBlogSection.description.length > 0
            ? currentBlogSection.description
            : 'Styl, inspirace a péče o vaše kožené doplňky.',
        featuredArticles: Array.isArray(currentBlogSection.featuredArticles)
          ? currentBlogSection.featuredArticles
          : [],
      }
    : undefined

  await payload.updateGlobal({
    slug: 'home-page',
    data: {
      aboutSection,
      marketingSlides: DEFAULT_MARKETING_SLIDES,
      testimonialsSection,
      ...(blogSection ? { blogSection } : {}),
    },
  })

  console.log(
    `Imported about section, ${DEFAULT_MARKETING_SLIDES.length} homepage marketing slides and ${testimonialItems.length} testimonials to admin.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Homepage slider import failed:', error)
    process.exit(1)
  })
