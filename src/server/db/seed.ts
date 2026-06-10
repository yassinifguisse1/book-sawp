import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "./connection";
import { users, books, userProfileLocations } from "./schema";
import { assignLegacyGenresToCategories, seedDefaultCategories } from "../domain/taxonomy";
import { seedMarketConfigs } from "../domain/markets";
import { seedSampleLocations } from "./seed-locations";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/**
 * Production seed mode is activated by setting BOOKSWAP_SEED_CLERK_ID to a real
 * Clerk user ID. In this mode we create a single "BookSwap Team" user and seed
 * 40 real book listings across 20 major cities so the marketplace looks alive
 * on day one.
 *
 * In dev mode (no env var) we keep the original 4 fake users + 12 books for
 * local development.
 */
const PRODUCTION_CLERK_ID = process.env.BOOKSWAP_SEED_CLERK_ID;
const isProductionMode = Boolean(PRODUCTION_CLERK_ID);

/* -------------------------------------------------------------------------- */
/*  Real book data — ISBNs chosen for reliable Open Library cover images.    */
/* -------------------------------------------------------------------------- */

const productionBooks = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    description: "A portrait of the Jazz Age in all its decadence and excess, Gatsby captured the spirit of the author's generation and earned itself a permanent place in American mythology.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9780743273565",
    language: "English",
    pages: 180,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "1984",
    author: "George Orwell",
    description: "Among the seminal texts of the 20th century, Nineteen Eighty-Four is a rare work that grows more haunting as its futuristic purgatory becomes more real.",
    genre: "Fiction",
    condition: "good" as const,
    isbn: "9780451524935",
    language: "English",
    pages: 328,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
    genre: "Fiction",
    condition: "likenew" as const,
    isbn: "9780061120084",
    language: "English",
    pages: 336,
    transactionType: "sale" as const,
    priceMinor: 899,
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "Since its immediate success in 1813, Pride and Prejudice has remained one of the most popular novels in the English language.",
    genre: "Romance",
    condition: "good" as const,
    isbn: "9780141439518",
    language: "English",
    pages: 435,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    description: "A great modern classic and the prelude to The Lord of the Rings. Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "9780547928227",
    language: "English",
    pages: 300,
    transactionType: "sale" as const,
    priceMinor: 1299,
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the 'spice' melange.",
    genre: "Sci-Fi & Fantasy",
    condition: "likenew" as const,
    isbn: "9780441172719",
    language: "English",
    pages: 412,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    description: "From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution that explores the ways in which biology and history have defined us.",
    genre: "Non-Fiction",
    condition: "verygood" as const,
    isbn: "9780062316097",
    language: "English",
    pages: 443,
    transactionType: "sale" as const,
    priceMinor: 1599,
  },
  {
    title: "Educated",
    author: "Tara Westover",
    description: "Born to survivalists in the mountains of Idaho, Tara Westover was seventeen the first time she set foot in a classroom. Her family was so isolated from mainstream society that there was no one to ensure the children received an education.",
    genre: "Biography",
    condition: "good" as const,
    isbn: "9780399590504",
    language: "English",
    pages: 352,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "Combining magic, mysticism, wisdom and wonder into an inspiring tale of self-discovery, The Alchemist has become a modern classic, selling millions of copies around the world.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9780062315007",
    language: "English",
    pages: 208,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    description: "No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear reveals practical strategies that will teach you exactly how to form good habits.",
    genre: "Self-Help",
    condition: "likenew" as const,
    isbn: "9780735211292",
    language: "English",
    pages: 320,
    transactionType: "sale" as const,
    priceMinor: 1899,
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    description: "The major New York Times bestseller that explains the two systems that drive the way we think. System 1 is fast, intuitive, and emotional; System 2 is slower, more deliberative, and more logical.",
    genre: "Non-Fiction",
    condition: "verygood" as const,
    isbn: "9780374533557",
    language: "English",
    pages: 499,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Body Keeps the Score",
    author: "Bessel van der Kolk",
    description: "Trauma is a fact of life. Veterans and their families deal with the painful aftermath of combat; one in five Americans has been molested; one in four grew up with alcoholics.",
    genre: "Self-Help",
    condition: "good" as const,
    isbn: "9780143127741",
    language: "English",
    pages: 464,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish. Except that right now, he doesn't know that.",
    genre: "Sci-Fi & Fantasy",
    condition: "likenew" as const,
    isbn: "9780593135204",
    language: "English",
    pages: 496,
    transactionType: "sale" as const,
    priceMinor: 1699,
  },
  {
    title: "Circe",
    author: "Madeline Miller",
    description: "In the house of Helios, god of the sun and mightiest of the Titans, a daughter is born. But Circe is a strange child -- not powerful, like her father, nor vicious like her mother.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "9780316556347",
    language: "English",
    pages: 393,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Normal People",
    author: "Sally Rooney",
    description: "At school Connell and Marianne pretend not to know each other. He's popular and well-adjusted, star of the school football team, while she is lonely, proud, and intensely private.",
    genre: "Romance",
    condition: "good" as const,
    isbn: "9781984822185",
    language: "English",
    pages: 273,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    description: "Alicia Berenson's life is seemingly perfect. A famous painter married to an in-demand fashion photographer, she lives in a grand house with big windows overlooking a park in one of London's most desirable areas.",
    genre: "Mystery",
    condition: "verygood" as const,
    isbn: "9781250301697",
    language: "English",
    pages: 325,
    transactionType: "sale" as const,
    priceMinor: 1299,
  },
  {
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    description: "For years, rumors of the 'Marsh Girl' have haunted Barkley Cove, a quiet town on the North Carolina coast. So in late 1969, when handsome Chase Andrews is found dead, the locals immediately suspect Kya Clark.",
    genre: "Fiction",
    condition: "likenew" as const,
    isbn: "9780735219090",
    language: "English",
    pages: 384,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Becoming",
    author: "Michelle Obama",
    description: "In a life filled with meaning and accomplishment, Michelle Obama has emerged as one of the most iconic and compelling women of our era. As First Lady of the United States of America, she helped create the most welcoming and inclusive White House in history.",
    genre: "Biography",
    condition: "verygood" as const,
    isbn: "9781524763138",
    language: "English",
    pages: 448,
    transactionType: "sale" as const,
    priceMinor: 1999,
  },
  {
    title: "Steve Jobs",
    author: "Walter Isaacson",
    description: "Based on more than forty interviews with Jobs conducted over two years—as well as interviews with more than a hundred family members, friends, adversaries, competitors, and colleagues—Walter Isaacson has written a riveting story.",
    genre: "Biography",
    condition: "good" as const,
    isbn: "9781451648539",
    language: "English",
    pages: 656,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Shoe Dog",
    author: "Phil Knight",
    description: "In this candid and riveting memoir, for the first time ever, Nike founder and board chairman Phil Knight shares the inside story of the company's early days as an intrepid start-up and its evolution into one of the world's most iconic brands.",
    genre: "Biography",
    condition: "verygood" as const,
    isbn: "9781508216228",
    language: "English",
    pages: 400,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    description: "Doing well with money isn't necessarily about what you know. It's about how you behave. And behavior is hard to teach, even to really smart people.",
    genre: "Self-Help",
    condition: "likenew" as const,
    isbn: "9780857197689",
    language: "English",
    pages: 252,
    transactionType: "sale" as const,
    priceMinor: 1499,
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
    description: "Deep work is the ability to focus without distraction on a cognitively demanding task. It's a skill that allows you to quickly master complicated information and produce better results in less time.",
    genre: "Self-Help",
    condition: "good" as const,
    isbn: "9781455586691",
    language: "English",
    pages: 304,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Subtle Art of Not Giving a F*ck",
    author: "Mark Manson",
    description: "In this generation-defining self-help guide, a superstar blogger cuts through the crap to show us how to stop trying to be 'positive' all the time so that we can truly become better, happier people.",
    genre: "Self-Help",
    condition: "verygood" as const,
    isbn: "9780062641540",
    language: "English",
    pages: 224,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    description: "Rich Dad Poor Dad is Robert's story of growing up with two dads — his real father and the father of his best friend, his rich dad — and the ways in which both men shaped his thoughts about money and investing.",
    genre: "Self-Help",
    condition: "fair" as const,
    isbn: "9781612680194",
    language: "English",
    pages: 336,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The 4-Hour Workweek",
    author: "Timothy Ferriss",
    description: "Forget the old concept of retirement and the rest of the deferred-life plan—there is no need to wait and every reason not to, especially in unpredictable economic times.",
    genre: "Self-Help",
    condition: "good" as const,
    isbn: "9780307465351",
    language: "English",
    pages: 396,
    transactionType: "sale" as const,
    priceMinor: 1099,
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    description: "Harry Potter has never been the star of a Quidditch team, scoring points while riding a broom far above the ground. He knows no spells, has never helped to hatch a dragon, and wears all his old clothes.",
    genre: "Children's",
    condition: "good" as const,
    isbn: "9780590353427",
    language: "English",
    pages: 309,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    description: "In the ruins of a place once known as North America lies the nation of Panem, a shining Capitol surrounded by twelve outlying districts. The Capitol keeps the districts in line by forcing them all to send one boy and one girl to participate in the annual Hunger Games.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "9780439023528",
    language: "English",
    pages: 374,
    transactionType: "sale" as const,
    priceMinor: 999,
  },
  {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    description: "In ancient times the Rings of Power were crafted by the Elven-smiths, and Sauron, the Dark Lord, forged the One Ring, filling it with his own power so that he could rule all others.",
    genre: "Sci-Fi & Fantasy",
    condition: "good" as const,
    isbn: "9780544003415",
    language: "English",
    pages: 1178,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "A Game of Thrones",
    author: "George R.R. Martin",
    description: "Long ago, in a time forgotten, a preternatural event threw the seasons out of balance. In a land where summers can last decades and winters a lifetime, trouble is brewing.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "9780553593716",
    language: "English",
    pages: 835,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    description: "Told in Kvothe's own voice, this is the tale of the magically gifted young man who grows to be the most notorious wizard his world has ever seen.",
    genre: "Sci-Fi & Fantasy",
    condition: "likenew" as const,
    isbn: "9780756404741",
    language: "English",
    pages: 662,
    transactionType: "sale" as const,
    priceMinor: 1499,
  },
  {
    title: "Mistborn",
    author: "Brandon Sanderson",
    description: "For a thousand years the ash fell and no flowers bloomed. For a thousand years the Skaa slaved in misery and lived in fear. For a thousand years the Lord Ruler reigned with absolute power and ultimate terror.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "9780765311788",
    language: "English",
    pages: 541,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Way of Kings",
    author: "Brandon Sanderson",
    description: "Roshar is a world of stone and storms. Uncanny tempests of incredible power sweep across the rocky terrain so frequently that they have shaped ecology and civilization alike.",
    genre: "Sci-Fi & Fantasy",
    condition: "good" as const,
    isbn: "9780765326355",
    language: "English",
    pages: 1007,
    transactionType: "sale" as const,
    priceMinor: 1899,
  },
  {
    title: "Norwegian Wood",
    author: "Haruki Murakami",
    description: "Toru, a quiet and preternaturally serious young college student in Tokyo, is devoted to Naoko, a beautiful and introspective young woman, but their mutual passion is marked by the tragic death of their best friend years before.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9780099448822",
    language: "English",
    pages: 296,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "Kafka on the Shore",
    author: "Haruki Murakami",
    description: "Kafka on the Shore is powered by two remarkable characters: a teenage boy, Kafka Tamura, who runs away from home either to escape a gruesome oedipal prophecy or to search for his long-missing mother and sister.",
    genre: "Fiction",
    condition: "good" as const,
    isbn: "9781400079278",
    language: "English",
    pages: 467,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "One Hundred Years of Solitude",
    author: "Gabriel García Márquez",
    description: "The brilliant, bestselling, landmark novel that tells the story of the Buendia family, and chronicles the irreconcilable conflict between the desire for solitude and the need for love.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9780060883287",
    language: "English",
    pages: 417,
    transactionType: "sale" as const,
    priceMinor: 1399,
  },
  {
    title: "Love in the Time of Cholera",
    author: "Gabriel García Márquez",
    description: "In their youth, Florentino Ariza and Fermina Daza fall passionately in love. When Fermina eventually chooses to marry a wealthy, well-born doctor, Florentino is devastated, but he is a romantic.",
    genre: "Romance",
    condition: "good" as const,
    isbn: "9780307389732",
    language: "English",
    pages: 348,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Kite Runner",
    author: "Khaled Hosseini",
    description: "The unforgettable, heartbreaking story of the unlikely friendship between a wealthy boy and the son of his father's servant, caught in the tragic sweep of history.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9781594631931",
    language: "English",
    pages: 371,
    transactionType: "giveaway" as const,
    priceMinor: null,
  },
  {
    title: "A Thousand Splendid Suns",
    author: "Khaled Hosseini",
    description: "A Thousand Splendid Suns is a breathtaking story set against the volatile events of Afghanistan's last thirty years—from the Soviet invasion to the reign of the Taliban to post-Taliban rebuilding.",
    genre: "Fiction",
    condition: "likenew" as const,
    isbn: "9781594483851",
    language: "English",
    pages: 372,
    transactionType: "sale" as const,
    priceMinor: 1299,
  },
  {
    title: "Life of Pi",
    author: "Yann Martel",
    description: "Life of Pi is a fantasy adventure novel by Yann Martel published in 2001. The protagonist, Piscine Molitor 'Pi' Patel, a Tamil boy from Pondicherry, explores issues of spirituality and practicality from an early age.",
    genre: "Fiction",
    condition: "good" as const,
    isbn: "9780156027328",
    language: "English",
    pages: 319,
    transactionType: "swap" as const,
    priceMinor: null,
  },
  {
    title: "The Book Thief",
    author: "Markus Zusak",
    description: "It is 1939. Nazi Germany. The country is holding its breath. Death has never been busier, and will be busier still. By her brother's graveside, Liesel's life is changed when she picks up a single object, partially hidden in the snow.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "9780375842207",
    language: "English",
    pages: 552,
    transactionType: "sale" as const,
    priceMinor: 1199,
  },
];

/* -------------------------------------------------------------------------- */
/*  Dev-mode sample data (legacy)                                            */
/* -------------------------------------------------------------------------- */

const devUsers = [
  {
    clerkUserId: "seed_user_1",
    name: "Emma Wilson",
    email: "emma@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    location: "Portland, OR",
    country: "US",
    city: "Portland",
    locationKey: "portland-or",
    bio: "Avid reader and book collector. Love sharing stories with fellow bookworms!",
  },
  {
    clerkUserId: "seed_user_2",
    name: "Marcus Chen",
    email: "marcus@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    location: "Seattle, WA",
    country: "US",
    city: "Seattle",
    locationKey: "seattle-wa",
    bio: "Sci-fi enthusiast and fantasy lover. Always looking for my next adventure.",
  },
  {
    clerkUserId: "seed_user_3",
    name: "Sophie Laurent",
    email: "sophie@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophie",
    location: "Paris, FR",
    country: "FR",
    city: "Paris",
    locationKey: "paris-fr",
    bio: "Romance and mystery reader. I believe every book has a soul.",
  },
  {
    clerkUserId: "seed_user_4",
    name: "James Mitchell",
    email: "james@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
    location: "London, UK",
    country: "GB",
    city: "London",
    locationKey: "london-gb",
    bio: "History buff and non-fiction reader. Let me know if you want to swap!",
  },
];

const devBooks = [
  {
    title: "The Last Dragon King",
    author: "Anya Sharma",
    description: "In a world where dragons once ruled the skies, one young prince must uncover the truth about his lineage before an ancient evil awakens.",
    genre: "Sci-Fi & Fantasy",
    condition: "verygood" as const,
    isbn: "978-0-123456-78-9",
    language: "English",
    pages: 432,
    transactionType: "swap" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 1,
    imageUrl: "/images/books/book1.jpg",
    shippingMinor: 399,
    pickupAvailable: true,
  },
  {
    title: "Nebula Dreams",
    author: "Marcus Reed",
    description: "When the colony ship Aetheria discovers a derelict alien station orbiting a dying star, the crew must confront the remnants of a civilization that mastered interstellar travel.",
    genre: "Sci-Fi & Fantasy",
    condition: "likenew" as const,
    isbn: "978-0-987654-32-1",
    language: "English",
    pages: 388,
    transactionType: "sale" as const,
    priceMinor: 1299,
    status: "active" as const,
    ownerIndex: 1,
    imageUrl: "/images/books/book2.jpg",
    shippingMinor: 399,
    pickupAvailable: false,
  },
  {
    title: "Paris in Bloom",
    author: "Isabella Monnet",
    description: "A heartwarming tale of love, loss, and second chances set against the backdrop of Parisian springtime.",
    genre: "Romance",
    condition: "good" as const,
    isbn: "978-0-555555-55-5",
    language: "English",
    pages: 296,
    transactionType: "giveaway" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 2,
    imageUrl: "/images/books/book3.jpg",
    shippingMinor: 0,
    pickupAvailable: true,
  },
  {
    title: "The Silent Witness",
    author: "Elara Vance",
    description: "Detective Sarah Connolly has one night to solve a murder that took place twenty years ago, before the statute of limitations runs out.",
    genre: "Mystery",
    condition: "verygood" as const,
    isbn: "978-0-444444-44-4",
    language: "English",
    pages: 356,
    transactionType: "swap" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 2,
    imageUrl: "/images/books/book4.jpg",
    shippingMinor: 399,
    pickupAvailable: true,
  },
  {
    title: "Mindful Mornings",
    author: "Sarah Chen",
    description: "Transform your life one morning at a time. This practical guide to mindfulness meditation helps you build a sustainable morning routine.",
    genre: "Self-Help",
    condition: "likenew" as const,
    isbn: "978-0-777777-77-7",
    language: "English",
    pages: 224,
    transactionType: "sale" as const,
    priceMinor: 850,
    status: "active" as const,
    ownerIndex: 0,
    imageUrl: "/images/books/book5.jpg",
    shippingMinor: 299,
    pickupAvailable: false,
  },
  {
    title: "The Clockmaker's Daughter",
    author: "Eleanor Vance",
    description: "In Victorian London, a young clockmaker's daughter discovers that her father's greatest creation holds the key to a centuries-old mystery.",
    genre: "Fiction",
    condition: "good" as const,
    isbn: "978-0-666666-66-6",
    language: "English",
    pages: 412,
    transactionType: "swap" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 3,
    imageUrl: "/images/books/book6.jpg",
    shippingMinor: 399,
    pickupAvailable: true,
  },
  {
    title: "The Magic Treehouse",
    author: "Oliver Finch",
    description: "Join four friends as they discover a magical treehouse that can transport them anywhere in time and space.",
    genre: "Children's",
    condition: "fair" as const,
    isbn: "978-0-333333-33-3",
    language: "English",
    pages: 186,
    transactionType: "giveaway" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 0,
    imageUrl: "/images/books/book7.jpg",
    shippingMinor: 0,
    pickupAvailable: true,
  },
  {
    title: "Against All Odds",
    author: "Dr. Alex Chen",
    description: "The inspiring true story of how a young immigrant overcame poverty, discrimination, and personal tragedy to become one of the most respected scientists of our generation.",
    genre: "Biography",
    condition: "verygood" as const,
    isbn: "978-0-222222-22-2",
    language: "English",
    pages: 368,
    transactionType: "sale" as const,
    priceMinor: 1500,
    status: "active" as const,
    ownerIndex: 3,
    imageUrl: "/images/books/book8.jpg",
    shippingMinor: 399,
    pickupAvailable: false,
  },
  {
    title: "Flavors of the Mediterranean",
    author: "Isabella Rossi",
    description: "A culinary journey through the sun-drenched coasts of the Mediterranean. From Greek mezze to Moroccan tagines, discover 150 recipes.",
    genre: "Non-Fiction",
    condition: "likenew" as const,
    isbn: "978-0-111111-11-1",
    language: "English",
    pages: 312,
    transactionType: "swap" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 2,
    imageUrl: "/images/books/book9.jpg",
    shippingMinor: 499,
    pickupAvailable: true,
  },
  {
    title: "Whispers in the Dark",
    author: "Victor Blackwood",
    description: "When the Whitmore family moves into their dream home, they don't realize it's been waiting for them.",
    genre: "Mystery",
    condition: "good" as const,
    isbn: "978-0-888888-88-8",
    language: "English",
    pages: 298,
    transactionType: "sale" as const,
    priceMinor: 699,
    status: "active" as const,
    ownerIndex: 1,
    imageUrl: "/images/books/book10.jpg",
    shippingMinor: 399,
    pickupAvailable: false,
  },
  {
    title: "The Art of Letting Go",
    author: "Isabella Chen",
    description: "A deeply moving literary novel about three generations of women bound together by a family secret.",
    genre: "Fiction",
    condition: "verygood" as const,
    isbn: "978-0-999999-99-9",
    language: "English",
    pages: 334,
    transactionType: "giveaway" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 0,
    imageUrl: "/images/books/book11.jpg",
    shippingMinor: 0,
    pickupAvailable: true,
  },
  {
    title: "Quantum Physics for Beginners",
    author: "Prof. David Nakamura",
    description: "Demystify the quantum world with this accessible introduction to the science that underpins our universe.",
    genre: "Academic",
    condition: "fair" as const,
    isbn: "978-0-000000-00-0",
    language: "English",
    pages: 256,
    transactionType: "swap" as const,
    priceMinor: null,
    status: "active" as const,
    ownerIndex: 3,
    imageUrl: "/images/books/book12.jpg",
    shippingMinor: 399,
    pickupAvailable: true,
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function openLibraryCover(isbn: string) {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/-/g, "")}-L.jpg`;
}

function distributeEvenly<T>(items: T[], buckets: number): T[][] {
  const result: T[][] = Array.from({ length: buckets }, () => []);
  items.forEach((item, index) => {
    result[index % buckets].push(item);
  });
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Seed logic                                                                 */
/* -------------------------------------------------------------------------- */

async function seed() {
  console.log("Seeding database...");
  const db = getDb();
  await seedDefaultCategories();
  await seedMarketConfigs();
  const locationsByKey = await seedSampleLocations();
  console.log(`Seeded ${locationsByKey.size} sample locations.`);

  if (isProductionMode) {
    await seedProduction(db, locationsByKey);
  } else {
    await seedDevelopment(db, locationsByKey);
  }

  await assignLegacyGenresToCategories();
  console.log("Seeding complete!");
}

async function seedProduction(
  db: ReturnType<typeof getDb>,
  locationsByKey: Map<string, number>,
) {
  console.log("Running in PRODUCTION seed mode.");
  if (!PRODUCTION_CLERK_ID) throw new Error("Missing BOOKSWAP_SEED_CLERK_ID");

  // 1. Upsert the BookSwap Team user
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, PRODUCTION_CLERK_ID))
    .limit(1);

  let teamUserId: number;
  if (existingUser) {
    await db
      .update(users)
      .set({
        name: "BookSwap Team",
        email: "team@bookswap.app",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bookswap",
        location: "Global",
        country: "US",
        city: "New York",
        bio: "We're the BookSwap team! These are example listings to help you explore the marketplace. List your own books to get started.",
      })
      .where(eq(users.id, existingUser.id));
    teamUserId = existingUser.id;
    console.log(`Updated BookSwap Team user (ID: ${teamUserId})`);
  } else {
    const [result] = await db.insert(users).values({
      clerkUserId: PRODUCTION_CLERK_ID,
      name: "BookSwap Team",
      email: "team@bookswap.app",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bookswap",
      location: "Global",
      country: "US",
      city: "New York",
      bio: "We're the BookSwap team! These are example listings to help you explore the marketplace. List your own books to get started.",
    });
    teamUserId = Number(result.insertId);
    console.log(`Created BookSwap Team user (ID: ${teamUserId})`);
  }

  // 2. Build city rotation from all seeded locations
  const cityKeys = Array.from(locationsByKey.keys());
  const booksByCity = distributeEvenly(productionBooks, cityKeys.length);

  let created = 0;
  let updated = 0;

  for (let cityIndex = 0; cityIndex < cityKeys.length; cityIndex++) {
    const cityKey = cityKeys[cityIndex];
    const locationId = locationsByKey.get(cityKey);
    const cityBooks = booksByCity[cityIndex];
    if (!cityBooks.length) continue;

    for (const book of cityBooks) {
      const coverUrl = openLibraryCover(book.isbn ?? "");
      const shippingMinor = book.transactionType === "sale" ? 399 : book.transactionType === "swap" ? 399 : 0;
      const pickupAvailable = book.transactionType !== "sale" || Math.random() > 0.4;
      const pickupEnabled = pickupAvailable;
      const manualShippingEnabled = shippingMinor > 0;
      const shippingScope: "pickup_only" | "domestic_only" | "worldwide" = manualShippingEnabled
        ? book.transactionType === "sale"
          ? "worldwide"
          : "domestic_only"
        : "pickup_only";

      const values = {
        title: book.title,
        author: book.author,
        description: book.description,
        genre: book.genre,
        condition: book.condition,
        isbn: book.isbn,
        language: book.language,
        pages: book.pages,
        transactionType: book.transactionType,
        status: "active" as const,
        ownerId: teamUserId,
        currency: "USD" as const,
        priceMinor: book.priceMinor,
        shippingMinor,
        country: cityKey.split("-").pop()?.toUpperCase() ?? "US",
        city: cityKey
          .split("-")
          .slice(0, -1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        locationId: locationId ?? null,
        pickupEnabled,
        pickupRadiusKm: pickupEnabled ? 25 : null,
        manualShippingEnabled,
        shippingScope,
        pickupAvailable,
        imageUrl: coverUrl,
        imageUrls: [coverUrl],
      };

      const [existing] = book.isbn
        ? await db.select({ id: books.id }).from(books).where(eq(books.isbn, book.isbn)).limit(1)
        : [];

      if (existing) {
        await db.update(books).set(values).where(eq(books.id, existing.id));
        updated += 1;
        console.log(`Updated: ${book.title} (${values.city})`);
      } else {
        const [result] = await db.insert(books).values(values);
        created += 1;
        console.log(`Created: ${book.title} (${values.city}) [ID: ${result.insertId}]`);
      }
    }
  }

  console.log(`Production books: ${created} created, ${updated} updated across ${cityKeys.length} cities.`);
}

async function seedDevelopment(
  db: ReturnType<typeof getDb>,
  locationsByKey: Map<string, number>,
) {
  console.log("Running in DEVELOPMENT seed mode.");

  const createdUsers: { id: number; locationId: number | null }[] = [];
  for (const user of devUsers) {
    const { locationKey, ...userValues } = user;
    const homeLocationId = locationsByKey.get(locationKey) ?? null;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, user.clerkUserId))
      .limit(1);

    let userId: number;
    if (existing) {
      await db
        .update(users)
        .set({
          name: userValues.name,
          email: userValues.email,
          avatar: userValues.avatar,
          location: userValues.location,
          country: userValues.country,
          city: userValues.city,
          bio: userValues.bio,
        })
        .where(eq(users.id, existing.id));
      userId = existing.id;
      console.log(`Updated user: ${user.name} (ID: ${userId})`);
    } else {
      const [result] = await db.insert(users).values(userValues);
      userId = Number(result.insertId);
      console.log(`Created user: ${user.name} (ID: ${userId})`);
    }

    if (homeLocationId) {
      await db
        .insert(userProfileLocations)
        .values({ userId, homeLocationId })
        .onDuplicateKeyUpdate({ set: { homeLocationId } });
    }
    createdUsers.push({ id: userId, locationId: homeLocationId });
  }

  const ownerCity: Record<number, { country: string; city: string }> = {
    [createdUsers[0].id]: { country: "US", city: "Portland" },
    [createdUsers[1].id]: { country: "US", city: "Seattle" },
    [createdUsers[2].id]: { country: "FR", city: "Paris" },
    [createdUsers[3].id]: { country: "GB", city: "London" },
  };

  let booksCreated = 0;
  let booksUpdated = 0;

  for (const book of devBooks) {
    const ownerId = createdUsers[book.ownerIndex].id;
    const place = ownerCity[ownerId] ?? { country: "US", city: "Unknown" };
    const pickupEnabled = book.pickupAvailable;
    const manualShippingEnabled = book.shippingMinor > 0;
    const shippingScope: "pickup_only" | "domestic_only" | "worldwide" = manualShippingEnabled
      ? book.transactionType === "sale"
        ? "worldwide"
        : "domestic_only"
      : "pickup_only";

    const listingValues = {
      ...book,
      ownerId,
      country: place.country,
      city: place.city,
      locationId: createdUsers[book.ownerIndex].locationId ?? null,
      pickupEnabled,
      manualShippingEnabled,
      shippingScope,
      pickupRadiusKm: pickupEnabled ? 25 : null,
    };

    const [existing] = book.isbn
      ? await db.select({ id: books.id }).from(books).where(eq(books.isbn, book.isbn)).limit(1)
      : [];

    if (existing) {
      await db.update(books).set(listingValues).where(eq(books.id, existing.id));
      booksUpdated += 1;
      console.log(`Updated book: ${book.title} (ID: ${existing.id})`);
      continue;
    }

    const [result] = await db.insert(books).values(listingValues);
    booksCreated += 1;
    console.log(`Created book: ${book.title} (ID: ${result.insertId})`);
  }

  console.log(`Dev books: ${booksCreated} created, ${booksUpdated} updated.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
