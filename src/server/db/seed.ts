import { config } from "dotenv";
import { closeDb, getDb } from "./connection";
import { users, books } from "./schema";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function seed() {
  console.log("Seeding database...");
  const db = getDb();

  // Create sample users
  const sampleUsers = [
    {
      clerkUserId: "seed_user_1",
      name: "Emma Wilson",
      email: "emma@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
      location: "Portland, OR",
      bio: "Avid reader and book collector. Love sharing stories with fellow bookworms!",
    },
    {
      clerkUserId: "seed_user_2",
      name: "Marcus Chen",
      email: "marcus@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
      location: "Seattle, WA",
      bio: "Sci-fi enthusiast and fantasy lover. Always looking for my next adventure.",
    },
    {
      clerkUserId: "seed_user_3",
      name: "Sophie Laurent",
      email: "sophie@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophie",
      location: "San Francisco, CA",
      bio: "Romance and mystery reader. I believe every book has a soul.",
    },
    {
      clerkUserId: "seed_user_4",
      name: "James Mitchell",
      email: "james@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
      location: "Austin, TX",
      bio: "History buff and non-fiction reader. Let me know if you want to swap!",
    },
  ];

  const createdUsers: { id: number }[] = [];
  for (const user of sampleUsers) {
    const [result] = await db.insert(users).values(user);
    createdUsers.push({ id: Number(result.insertId) });
    console.log(`Created user: ${user.name} (ID: ${result.insertId})`);
  }

  // Create sample books
  const sampleBooks = [
    {
      title: "The Last Dragon King",
      author: "Anya Sharma",
      description: "In a world where dragons once ruled the skies, one young prince must uncover the truth about his lineage before an ancient evil awakens. A sweeping fantasy epic filled with magic, betrayal, and redemption.",
      genre: "Sci-Fi & Fantasy",
      condition: "verygood" as const,
      isbn: "978-0-123456-78-9",
      language: "English",
      pages: 432,
      transactionType: "swap" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[1].id,
      imageUrl: "/images/books/book1.jpg",
      shippingMinor: 399,
      pickupAvailable: true,
    },
    {
      title: "Nebula Dreams",
      author: "Marcus Reed",
      description: "When the colony ship Aetheria discovers a derelict alien station orbiting a dying star, the crew must confront the remnants of a civilization that mastered interstellar travel millennia before humans.",
      genre: "Sci-Fi & Fantasy",
      condition: "likenew" as const,
      isbn: "978-0-987654-32-1",
      language: "English",
      pages: 388,
      transactionType: "sale" as const,
      priceMinor: 1299,
      status: "active" as const,
      ownerId: createdUsers[1].id,
      imageUrl: "/images/books/book2.jpg",
      shippingMinor: 399,
      pickupAvailable: false,
    },
    {
      title: "Paris in Bloom",
      author: "Isabella Monnet",
      description: "A heartwarming tale of love, loss, and second chances set against the backdrop of Parisian springtime. Clara discovers that sometimes the most beautiful gardens grow from the seeds of heartbreak.",
      genre: "Romance",
      condition: "good" as const,
      isbn: "978-0-555555-55-5",
      language: "English",
      pages: 296,
      transactionType: "giveaway" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[2].id,
      imageUrl: "/images/books/book3.jpg",
      shippingMinor: 0,
      pickupAvailable: true,
    },
    {
      title: "The Silent Witness",
      author: "Elara Vance",
      description: "Detective Sarah Connolly has one night to solve a murder that took place twenty years ago, before the statute of limitations runs out. But the deeper she digs, the more she realizes that some secrets should stay buried.",
      genre: "Mystery",
      condition: "verygood" as const,
      isbn: "978-0-444444-44-4",
      language: "English",
      pages: 356,
      transactionType: "swap" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[2].id,
      imageUrl: "/images/books/book4.jpg",
      shippingMinor: 399,
      pickupAvailable: true,
    },
    {
      title: "Mindful Mornings",
      author: "Sarah Chen",
      description: "Transform your life one morning at a time. This practical guide to mindfulness meditation helps you build a sustainable morning routine that nourishes your mind, body, and spirit.",
      genre: "Self-Help",
      condition: "likenew" as const,
      isbn: "978-0-777777-77-7",
      language: "English",
      pages: 224,
      transactionType: "sale" as const,
      priceMinor: 850,
      status: "active" as const,
      ownerId: createdUsers[0].id,
      imageUrl: "/images/books/book5.jpg",
      shippingMinor: 299,
      pickupAvailable: false,
    },
    {
      title: "The Clockmaker's Daughter",
      author: "Eleanor Vance",
      description: "In Victorian London, a young clockmaker's daughter discovers that her father's greatest creation - a mechanical bird that can sing - holds the key to a centuries-old mystery involving the Crown Jewels.",
      genre: "Fiction",
      condition: "good" as const,
      isbn: "978-0-666666-66-6",
      language: "English",
      pages: 412,
      transactionType: "swap" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[3].id,
      imageUrl: "/images/books/book6.jpg",
      shippingMinor: 399,
      pickupAvailable: true,
    },
    {
      title: "The Magic Treehouse",
      author: "Oliver Finch",
      description: "Join four friends as they discover a magical treehouse that can transport them anywhere in time and space. Their first adventure takes them to ancient Egypt, where they must solve a riddle to return home.",
      genre: "Children's",
      condition: "fair" as const,
      isbn: "978-0-333333-33-3",
      language: "English",
      pages: 186,
      transactionType: "giveaway" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[0].id,
      imageUrl: "/images/books/book7.jpg",
      shippingMinor: 0,
      pickupAvailable: true,
    },
    {
      title: "Against All Odds",
      author: "Dr. Alex Chen",
      description: "The inspiring true story of how a young immigrant overcame poverty, discrimination, and personal tragedy to become one of the most respected scientists of our generation. A testament to the power of perseverance.",
      genre: "Biography",
      condition: "verygood" as const,
      isbn: "978-0-222222-22-2",
      language: "English",
      pages: 368,
      transactionType: "sale" as const,
      priceMinor: 1500,
      status: "active" as const,
      ownerId: createdUsers[3].id,
      imageUrl: "/images/books/book8.jpg",
      shippingMinor: 399,
      pickupAvailable: false,
    },
    {
      title: "Flavors of the Mediterranean",
      author: "Isabella Rossi",
      description: "A culinary journey through the sun-drenched coasts of the Mediterranean. From Greek mezze to Moroccan tagines, discover 150 recipes that celebrate the region's vibrant food culture.",
      genre: "Non-Fiction",
      condition: "likenew" as const,
      isbn: "978-0-111111-11-1",
      language: "English",
      pages: 312,
      transactionType: "swap" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[2].id,
      imageUrl: "/images/books/book9.jpg",
      shippingMinor: 499,
      pickupAvailable: true,
    },
    {
      title: "Whispers in the Dark",
      author: "Victor Blackwood",
      description: "When the Whitmore family moves into their dream home, they don't realize it's been waiting for them. As the house begins to reveal its dark history, they must decide whether to flee or face the entity that whispers in the walls.",
      genre: "Mystery",
      condition: "good" as const,
      isbn: "978-0-888888-88-8",
      language: "English",
      pages: 298,
      transactionType: "sale" as const,
      priceMinor: 699,
      status: "active" as const,
      ownerId: createdUsers[1].id,
      imageUrl: "/images/books/book10.jpg",
      shippingMinor: 399,
      pickupAvailable: false,
    },
    {
      title: "The Art of Letting Go",
      author: "Isabella Chen",
      description: "A deeply moving literary novel about three generations of women bound together by a family secret. When Lila inherits her grandmother's lake house, she must confront the past to find her future.",
      genre: "Fiction",
      condition: "verygood" as const,
      isbn: "978-0-999999-99-9",
      language: "English",
      pages: 334,
      transactionType: "giveaway" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[0].id,
      imageUrl: "/images/books/book11.jpg",
      shippingMinor: 0,
      pickupAvailable: true,
    },
    {
      title: "Quantum Physics for Beginners",
      author: "Prof. David Nakamura",
      description: "Demystify the quantum world with this accessible introduction to the science that underpins our universe. From wave-particle duality to quantum entanglement, discover the wonders of the subatomic realm.",
      genre: "Academic",
      condition: "fair" as const,
      isbn: "978-0-000000-00-0",
      language: "English",
      pages: 256,
      transactionType: "swap" as const,
      priceMinor: null,
      status: "active" as const,
      ownerId: createdUsers[3].id,
      imageUrl: "/images/books/book12.jpg",
      shippingMinor: 399,
      pickupAvailable: true,
    },
  ];

  for (const book of sampleBooks) {
    const [result] = await db.insert(books).values(book);
    console.log(`Created book: ${book.title} (ID: ${result.insertId})`);
  }

  console.log("Seeding complete!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
