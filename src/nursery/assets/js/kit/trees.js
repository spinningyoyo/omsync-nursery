// Tree painters shared by the scenes. Each takes the painter `g`, a plant `p`, its size `s`
// (0..1) and its base row, plus the scene's rows, tones and trunk colours. A painter records the
// crown it drew in p.crown, so leaves and petals can fall from it.

// The broadleaf family lives in broadleaf.js; scenes import it from here.
export { broadleafTree } from "./broadleaf.js";

// The conifer family lives in conifer.js, on the broadleaf family's footing.
export { bookPine, coniferTree, sequoiaTree } from "./conifer.js";
