export type Theme = "floral" | "marble" | "animal" | "food" | "botanical" | "geometric" | "abstract" | "vintage" | "celestial" | "coastal";

export type Status = "pending" | "generated" | "approved" | "submitted";

export interface Design {
  id: string;
  theme: Theme;
  burgaRef: string;
  burgaUrl: string;
  name: string;
  prompt: string;
}

export const THEMES = [
  { id: "all", label: "ALL", jp: "全て" },
  { id: "floral", label: "FLORAL", jp: "フローラル" },
  { id: "marble", label: "MARBLE", jp: "マーブル" },
  { id: "animal", label: "ANIMAL", jp: "アニマル" },
  { id: "food", label: "FOOD", jp: "フード" },
  { id: "botanical", label: "BOTANICAL", jp: "ボタニカル" },
  { id: "geometric", label: "GEOMETRIC", jp: "幾何学" },
  { id: "abstract", label: "ABSTRACT", jp: "アブストラクト" },
  { id: "vintage", label: "VINTAGE", jp: "ヴィンテージ" },
  { id: "celestial", label: "CELESTIAL", jp: "天体" },
  { id: "coastal", label: "COASTAL", jp: "コースタル" },
] as const;

export const STATUSES = [
  { id: "pending",   jp: "未着手", bg: "#F0EAE0", fg: "#8B7355", border: "#D4C5A9" },
  { id: "generated", jp: "生成済", bg: "#E0EAF0", fg: "#3A6B8C", border: "#AACBD9" },
  { id: "approved",  jp: "OK",    bg: "#DEE8D7", fg: "#4A6B3A", border: "#AAC799" },
  { id: "submitted", jp: "入稿",  bg: "#EADCE7", fg: "#6B3A5C", border: "#C9A3C0" },
] as const;

export const DESIGNS: Design[] = [
  // 1. FLORAL (001-010)
  { id: "001", theme: "floral", burgaRef: "Sakura", burgaUrl: "https://burga.com/products/sakura-airpods-pro-3-case", name: "Sakura Pink", prompt: "Seamless pattern of soft pink cherry blossoms with delicate branches, Japanese watercolor style, on cream background, feminine and serene, tileable, no text" },
  { id: "002", theme: "floral", burgaRef: "Lush Meadows", burgaUrl: "https://burga.com/products/floral-airpods-pro-case", name: "Lush Meadow", prompt: "Seamless pattern of mixed wildflowers including daisies poppies and cornflowers, loose painterly style, vibrant colors on sage green background, romantic, tileable, no text" },
  { id: "003", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Vintage Rose", prompt: "Seamless pattern of deep red roses with dark green leaves, vintage oil painting style, on burgundy background, moody and romantic, tileable, no text" },
  { id: "004", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Pastel Peony", prompt: "Seamless pattern of large blush pink peonies in full bloom, soft watercolor wash, on ivory background, dreamy and feminine, tileable, no text" },
  { id: "005", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Tropical Hibiscus", prompt: "Seamless pattern of bold red hibiscus flowers with tropical green leaves, vintage botanical illustration, on black background, exotic, tileable, no text" },
  { id: "006", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Watercolor Daisies", prompt: "Seamless pattern of simple white daisies with yellow centers, loose watercolor style, on pale blue background, cheerful and fresh, tileable, no text" },
  { id: "007", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Art Nouveau Lily", prompt: "Seamless pattern of stylized calla lilies with flowing art nouveau lines, gold accents on navy blue background, elegant and refined, tileable, no text" },
  { id: "008", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Forget Me Not", prompt: "Seamless pattern of tiny blue forget-me-not flowers scattered evenly, vintage botanical illustration, on warm cream background, delicate and nostalgic, tileable, no text" },
  { id: "009", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Botanical Garden", prompt: "Seamless pattern of detailed botanical illustrations of mixed flowers and herbs, vintage encyclopedia style, on beige parchment background, scholarly, tileable, no text" },
  { id: "010", theme: "floral", burgaRef: "—", burgaUrl: "", name: "Japanese Iris", prompt: "Seamless pattern of Japanese irises in flowing blue ink, sumi-e brush style, on rice paper texture background, zen minimalism, tileable, no text" },

  // 2. MARBLE (011-020)
  { id: "011", theme: "marble", burgaRef: "Vanilla Sand", burgaUrl: "https://burga.com/products/marble-airpods-3-case", name: "Vanilla Sand", prompt: "Seamless pattern of creamy white marble with subtle beige and gray veining, realistic luxury stone texture, elegant and timeless, tileable, no text" },
  { id: "012", theme: "marble", burgaRef: "Golden Coral", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Golden Coral", prompt: "Seamless pattern of soft pink marble with golden metallic veins, realistic luxury stone texture, romantic and glamorous, tileable, no text" },
  { id: "013", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Black Onyx", prompt: "Seamless pattern of jet black marble with fine silver and white veining, realistic luxury stone texture, sophisticated and dramatic, tileable, no text" },
  { id: "014", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Rose Quartz", prompt: "Seamless pattern of translucent rose quartz crystal with soft pink tones and white streaks, realistic stone texture, tileable, no text" },
  { id: "015", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Malachite", prompt: "Seamless pattern of deep green malachite with concentric dark and light rings, realistic luxury stone texture, tileable, no text" },
  { id: "016", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Navy Royale", prompt: "Seamless pattern of deep navy blue marble with ornate gold veining, realistic luxury stone texture, regal and opulent, tileable, no text" },
  { id: "017", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Carrara Classic", prompt: "Seamless pattern of pure white Carrara marble with thin gray veins, realistic luxury stone texture, timeless and refined, tileable, no text" },
  { id: "018", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Terracotta", prompt: "Seamless pattern of warm terracotta marble with cream colored veins, realistic earthy stone texture, warm and organic, tileable, no text" },
  { id: "019", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Emerald Jade", prompt: "Seamless pattern of emerald green jade with white and gold streaks, realistic luxury stone texture, tileable, no text" },
  { id: "020", theme: "marble", burgaRef: "—", burgaUrl: "", name: "Iridescent Pearl", prompt: "Seamless pattern of iridescent pearlescent marble with rainbow shimmer, realistic luxury stone texture, mystical, tileable, no text" },

  // 3. ANIMAL (021-030)
  { id: "021", theme: "animal", burgaRef: "Celestial", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Celestial Cow", prompt: "Seamless pattern of brown and cream cow print, organic irregular shapes, realistic hide texture, rustic chic, tileable, no text" },
  { id: "022", theme: "animal", burgaRef: "Derby Race", burgaUrl: "https://burga.com", name: "Derby Horse", prompt: "Seamless pattern of horses in various poses galloping trotting and standing, hand-drawn navy blue ink sketch, vintage engraving style on cream background, tileable, no text" },
  { id: "023", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Leopard Classic", prompt: "Seamless pattern of classic leopard print spots in black and brown on tan background, realistic fur texture, bold and fashionable, tileable, no text" },
  { id: "024", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Zebra Stripes", prompt: "Seamless pattern of organic zebra stripes in black on white background, realistic and elegant, tileable, no text" },
  { id: "025", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Python Skin", prompt: "Seamless pattern of python snake skin in natural beige and brown tones, detailed scales texture, exotic, tileable, no text" },
  { id: "026", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Giraffe Mosaic", prompt: "Seamless pattern of giraffe print spots in warm brown on golden tan background, organic irregular shapes, tileable, no text" },
  { id: "027", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Tiger Stripes", prompt: "Seamless pattern of tiger stripes in orange and black, bold and fierce, realistic fur texture, tileable, no text" },
  { id: "028", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Pink Leopard", prompt: "Seamless pattern of leopard print spots in black and hot pink on soft pink background, playful and bold, tileable, no text" },
  { id: "029", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Dalmatian Spots", prompt: "Seamless pattern of irregular black spots on white background, minimalist dalmatian print, graphic and clean, tileable, no text" },
  { id: "030", theme: "animal", burgaRef: "—", burgaUrl: "", name: "Cheetah Minimal", prompt: "Seamless pattern of small cheetah print spots in black and tan on cream background, refined and subtle, tileable, no text" },

  // 4. FOOD (031-040)
  { id: "031", theme: "food", burgaRef: "Harvest", burgaUrl: "https://burga.com/products/harvest-airpods-pro-3-case", name: "Harvest Tomato", prompt: "Seamless pattern of red tomatoes scattered over red and white gingham checks, graphic food illustration, homey and nostalgic, tileable, no text" },
  { id: "032", theme: "food", burgaRef: "Freshly Picked", burgaUrl: "https://burga.com/products/freshly-picked-airpods-pro-3-case", name: "Freshly Picked", prompt: "Seamless pattern of scattered red strawberries with green leaves, playful hand-drawn style, on cream background, summery and abundant, tileable, no text" },
  { id: "033", theme: "food", burgaRef: "Pickled", burgaUrl: "https://burga.com/products/pickled-airpods-pro-3-case", name: "Pickled", prompt: "Seamless pattern of pickle jars and cucumbers with dill, vintage illustration, on olive green background, quirky vintage charm, tileable, no text" },
  { id: "034", theme: "food", burgaRef: "Honeycomb", burgaUrl: "https://burga.com/products/honeycomb-airpods-pro-3-case", name: "Honeycomb Bee", prompt: "Seamless pattern of honey bees with honeycomb hexagons and yellow gingham accents, graphic illustration, warm and golden, tileable, no text" },
  { id: "035", theme: "food", burgaRef: "Cinnamon Roll", burgaUrl: "https://burga.com/products/cinnamon-roll-airpods-pro-3-case", name: "Cinnamon Roll", prompt: "Seamless pattern of swirled cinnamon rolls with icing, cozy illustration style, on warm beige background, comforting, tileable, no text" },
  { id: "036", theme: "food", burgaRef: "Cherrybomb", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Cherry", prompt: "Seamless pattern of red cherries with green stems on black background, glossy and elegant, tileable, no text" },
  { id: "037", theme: "food", burgaRef: "—", burgaUrl: "", name: "Lemon Zest", prompt: "Seamless pattern of bright yellow lemons with green leaves, watercolor illustration, on soft blue background, Mediterranean summer, tileable, no text" },
  { id: "038", theme: "food", burgaRef: "—", burgaUrl: "", name: "Mushroom Forest", prompt: "Seamless pattern of various woodland mushrooms including red cap and chanterelle, vintage botanical illustration, on dark green background, foraged and whimsical, tileable, no text" },
  { id: "039", theme: "food", burgaRef: "—", burgaUrl: "", name: "Coffee Beans", prompt: "Seamless pattern of roasted coffee beans scattered, realistic illustration, on dark brown background, rich and warm, tileable, no text" },
  { id: "040", theme: "food", burgaRef: "—", burgaUrl: "", name: "Orange Grove", prompt: "Seamless pattern of bright oranges with green leaves and white blossoms, vintage botanical illustration, on terracotta background, Mediterranean, tileable, no text" },

  // 5. BOTANICAL (041-050)
  { id: "041", theme: "botanical", burgaRef: "Velvet Night", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Velvet Ginkgo", prompt: "Seamless pattern of ginkgo leaves in deep navy and gold, art nouveau style, on midnight blue background, elegant and nocturnal, tileable, no text" },
  { id: "042", theme: "botanical", burgaRef: "Barely Yours", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Barely Ginkgo", prompt: "Seamless pattern of ginkgo leaves in soft taupe and cream, minimalist botanical, on pale beige background, serene and understated, tileable, no text" },
  { id: "043", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Monstera Jungle", prompt: "Seamless pattern of large monstera leaves in rich green with natural splits, realistic botanical illustration, on dark green background, tropical, tileable, no text" },
  { id: "044", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Fern Lace", prompt: "Seamless pattern of delicate fern fronds in forest green, detailed botanical illustration, on cream background, woodland elegance, tileable, no text" },
  { id: "045", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Palm Shadow", prompt: "Seamless pattern of palm fronds in dark green silhouette style, on warm sand background, minimalist tropical, tileable, no text" },
  { id: "046", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Eucalyptus", prompt: "Seamless pattern of eucalyptus branches with silver-green leaves, watercolor style, on soft white background, fresh and calming, tileable, no text" },
  { id: "047", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Ivy Trellis", prompt: "Seamless pattern of climbing ivy vines with small dark green leaves, vintage botanical illustration, on cream background, English garden, tileable, no text" },
  { id: "048", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Jungle Canopy", prompt: "Seamless pattern of mixed tropical leaves including banana monstera and philodendron, lush and dense, realistic colors, tileable, no text" },
  { id: "049", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Bamboo Grove", prompt: "Seamless pattern of bamboo stalks with slender leaves, minimalist Japanese ink style, on warm white background, zen, tileable, no text" },
  { id: "050", theme: "botanical", burgaRef: "—", burgaUrl: "", name: "Pressed Florals", prompt: "Seamless pattern of dried and pressed wildflowers in muted tones, herbarium style, on aged cream background, nostalgic and scholarly, tileable, no text" },

  // 6. GEOMETRIC (051-060)
  { id: "051", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Black White Checker", prompt: "Seamless pattern of bold black and white checkerboard squares, crisp and graphic, minimalist, tileable, no text" },
  { id: "052", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Red Gingham", prompt: "Seamless pattern of classic red and white gingham checks, fresh and country, tileable, no text" },
  { id: "053", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Art Deco Gold", prompt: "Seamless pattern of art deco fan motifs in gold on deep navy background, 1920s luxury style, tileable, no text" },
  { id: "054", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Houndstooth", prompt: "Seamless pattern of classic black and white houndstooth, sophisticated menswear style, tileable, no text" },
  { id: "055", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Argyle", prompt: "Seamless pattern of argyle diamonds in burgundy forest green and cream, preppy classic, tileable, no text" },
  { id: "056", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Retro Circles", prompt: "Seamless pattern of overlapping circles in mustard yellow teal and rust, 1970s retro style, on cream background, tileable, no text" },
  { id: "057", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Minimal Stripes", prompt: "Seamless pattern of clean vertical stripes in navy and cream, minimalist and timeless, tileable, no text" },
  { id: "058", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Triangle Mountains", prompt: "Seamless pattern of stacked triangles forming abstract mountain ranges, geometric, earth tones, tileable, no text" },
  { id: "059", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Hexagon Gold", prompt: "Seamless pattern of connected hexagons in metallic gold and cream, geometric luxury, tileable, no text" },
  { id: "060", theme: "geometric", burgaRef: "—", burgaUrl: "", name: "Moroccan Tile", prompt: "Seamless pattern of intricate Moroccan tile motifs in deep blue and white, ornate geometric, tileable, no text" },

  // 7. ABSTRACT (061-070)
  { id: "061", theme: "abstract", burgaRef: "Core", burgaUrl: "https://burga.jp/collections/airpods-pro-3-cases", name: "Core Blocks", prompt: "Seamless pattern of abstract color blocks in warm brown sky blue and cream, organic shapes overlapping, midcentury modern, tileable, no text" },
  { id: "062", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Sunset Gradient", prompt: "Seamless smooth gradient blending from coral pink to warm orange to deep purple, sunset colors, painterly wash, tileable, no text" },
  { id: "063", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Ocean Gradient", prompt: "Seamless smooth gradient blending from deep teal to turquoise to pale aqua, ocean colors, painterly, tileable, no text" },
  { id: "064", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Paint Splash", prompt: "Seamless pattern of abstract paint splashes in vibrant red cobalt blue and yellow, expressive and energetic, on white background, tileable, no text" },
  { id: "065", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Organic Blobs", prompt: "Seamless pattern of smooth organic blob shapes in pastel mauve sage and cream, gentle and flowy, tileable, no text" },
  { id: "066", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Brush Strokes", prompt: "Seamless pattern of thick expressive brush strokes in black on white background, sumi-e influence, bold and abstract, tileable, no text" },
  { id: "067", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Watercolor Wash", prompt: "Seamless pattern of soft watercolor washes in dusty rose lavender and butter yellow, painterly and dreamy, tileable, no text" },
  { id: "068", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Risograph Grain", prompt: "Seamless abstract pattern with risograph-style grainy textures in coral pink and teal, overlapping circles, tileable, no text" },
  { id: "069", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Memphis Style", prompt: "Seamless pattern of Memphis design elements - squiggles dots triangles and asterisks, in primary colors on white background, 1980s playful, tileable, no text" },
  { id: "070", theme: "abstract", burgaRef: "—", burgaUrl: "", name: "Drip Paint", prompt: "Seamless pattern of vertical paint drips in rich oxblood red on cream background, painterly and raw, tileable, no text" },

  // 8. VINTAGE (071-080)
  { id: "071", theme: "vintage", burgaRef: "La Muse", burgaUrl: "https://burga.com", name: "La Muse Deco", prompt: "Seamless pattern of art deco female silhouettes with fans and geometric frames, gold on black background, 1920s luxury glamour, tileable, no text" },
  { id: "072", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Victorian Damask", prompt: "Seamless pattern of ornate Victorian damask scrollwork in cream on burgundy background, regal and intricate, tileable, no text" },
  { id: "073", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "William Morris", prompt: "Seamless pattern in William Morris style with stylized flowers and vines in muted forest green and rust red, arts and crafts movement, tileable, no text" },
  { id: "074", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Retro 70s Bloom", prompt: "Seamless pattern of stylized 1970s flowers with wavy petals in mustard avocado and burnt orange, groovy and retro, tileable, no text" },
  { id: "075", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Vintage Lace", prompt: "Seamless pattern of delicate white lace doily motifs on soft cream background, romantic and nostalgic, tileable, no text" },
  { id: "076", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Toile de Jouy", prompt: "Seamless pattern in classic toile de jouy style with pastoral scenes in blue on cream background, French country elegance, tileable, no text" },
  { id: "077", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Baroque Gold", prompt: "Seamless pattern of baroque ornamental scrollwork in metallic gold on deep black background, opulent and dramatic, tileable, no text" },
  { id: "078", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Rococo Rose", prompt: "Seamless pattern of rococo garlands with pink roses and gold ribbons on cream background, feminine and ornate, tileable, no text" },
  { id: "079", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Moroccan Medallion", prompt: "Seamless pattern of Moroccan medallions in deep teal and gold on warm terracotta background, mystical vintage, tileable, no text" },
  { id: "080", theme: "vintage", burgaRef: "—", burgaUrl: "", name: "Persian Carpet", prompt: "Seamless pattern inspired by Persian carpets with intricate floral medallions in deep red navy and gold, traditional and luxurious, tileable, no text" },

  // 9. CELESTIAL (081-090)
  { id: "081", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Starry Night", prompt: "Seamless pattern of swirling starry night sky inspired by Van Gogh, blue yellow and white, painterly and dreamy, tileable, no text" },
  { id: "082", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Moon Phases", prompt: "Seamless pattern of moon phases from new to full, white on deep navy background, celestial and meditative, tileable, no text" },
  { id: "083", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Constellations", prompt: "Seamless pattern of constellation diagrams with connecting lines and star points, gold on midnight blue background, astronomical, tileable, no text" },
  { id: "084", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Galaxy Nebula", prompt: "Seamless pattern of swirling galaxy nebula with purple pink and blue clouds with white stars, cosmic and dreamy, tileable, no text" },
  { id: "085", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Solar System", prompt: "Seamless pattern of minimalist solar system with planets and orbital rings, line art style, gold on black background, tileable, no text" },
  { id: "086", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Crescent Stars", prompt: "Seamless pattern of crescent moons surrounded by small stars, gold on deep navy background, mystical, tileable, no text" },
  { id: "087", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Sun & Moon", prompt: "Seamless pattern of stylized sun and moon faces with rays and dots, vintage celestial illustration, gold on black background, tileable, no text" },
  { id: "088", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Zodiac Glyphs", prompt: "Seamless pattern of zodiac astrology symbols and constellations, gold on deep purple background, mystical and spiritual, tileable, no text" },
  { id: "089", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Cosmic Ombre", prompt: "Seamless pattern of deep space cosmic ombre blending black navy and indigo with scattered tiny stars, dreamy, tileable, no text" },
  { id: "090", theme: "celestial", burgaRef: "—", burgaUrl: "", name: "Gold Stars", prompt: "Seamless pattern of small five-pointed gold stars scattered evenly on deep black background, minimalist celestial, tileable, no text" },

  // 10. COASTAL (091-100)
  { id: "091", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Hokusai Wave", prompt: "Seamless pattern of stylized ocean waves inspired by Hokusai, deep blue with white foam, Japanese woodblock style, tileable, no text" },
  { id: "092", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Palm Sunset", prompt: "Seamless pattern of palm tree silhouettes against coral pink sunset sky, tropical dreamy, tileable, no text" },
  { id: "093", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Tropical Fish", prompt: "Seamless pattern of colorful tropical fish and coral, vintage illustration style, on teal background, underwater tropical, tileable, no text" },
  { id: "094", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Seashells", prompt: "Seamless pattern of various seashells including conch and scallop, watercolor illustration, on soft cream background, beach nostalgia, tileable, no text" },
  { id: "095", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Mediterranean Tile", prompt: "Seamless pattern of blue and white Mediterranean tiles with floral motifs, Greek island style, tileable, no text" },
  { id: "096", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Coral Reef", prompt: "Seamless pattern of coral branches in coral pink and mustard yellow, vintage botanical illustration, on teal background, tileable, no text" },
  { id: "097", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Wave Gradient", prompt: "Seamless pattern of smooth wavy lines in ocean blues and aqua greens, gradient wave, tileable, no text" },
  { id: "098", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Beach Sunset", prompt: "Seamless pattern of abstract beach sunset horizons in coral peach and lavender stripes, dreamy gradient, tileable, no text" },
  { id: "099", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Pineapple", prompt: "Seamless pattern of golden pineapples with green crown leaves, graphic illustration, on pink background, tropical, tileable, no text" },
  { id: "100", theme: "coastal", burgaRef: "—", burgaUrl: "", name: "Flamingo Tropical", prompt: "Seamless pattern of pink flamingos with tropical palm leaves, vintage illustration, on teal green background, resort style, tileable, no text" },
];
