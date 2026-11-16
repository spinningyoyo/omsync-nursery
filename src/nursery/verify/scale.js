// The builds the scale rule reads: each adult member's spec, by the "family/member" name the
// checks use (families.js REAL_LENGTH holds its real length). A spec's `len` is the body's length
// in px, rump to chest, without the head, neck or tail.

import { BLACK, GRIZZLY } from "../js/kit/bear.js";
import { BIGHORN, BISON } from "../js/kit/bovid.js";
import { ARCTIC, COYOTE, RED, WOLF } from "../js/kit/canid.js";
import { DEER_SPECS } from "../js/kit/deer.js";
import { AFRICAN, ASIAN } from "../js/kit/elephant.js";
import { FELIDS } from "../js/kit/felid.js";
import { ZEBRA } from "../js/kit/horse.js";

export const SPECS = {
  "cats/cat": FELIDS.housecat,
  "cats/bobcat": FELIDS.bobcat,
  "cats/clouded-leopard": FELIDS.clouded,
  "cats/cheetah": FELIDS.cheetah,
  "cats/cougar": FELIDS.cougar,
  "cats/lion": FELIDS.lion,
  "dogs/arctic-fox": ARCTIC,
  "dogs/fox": RED,
  "dogs/coyote": COYOTE,
  "dogs/wolf": WOLF,
  "bears/bear": BLACK,
  "bears/grizzly": GRIZZLY,
  "deer/pronghorn": DEER_SPECS.PRONGHORN,
  "deer/deer": DEER_SPECS.WHITETAIL,
  "deer/deer-buck": DEER_SPECS.WT_BUCK,
  "deer/stag-cow": DEER_SPECS.RD_COWDEER,
  "deer/stag": DEER_SPECS.RD_BULL,
  "deer/elk-cow": DEER_SPECS.ELK_COW,
  "deer/elk": DEER_SPECS.ELK,
  "cattle-sheep/bighorn": BIGHORN,
  "cattle-sheep/bison": BISON,
  "horses/zebra": ZEBRA,
  "elephants/elephant-asian": ASIAN,
  "elephants/elephant-african": AFRICAN,
};
