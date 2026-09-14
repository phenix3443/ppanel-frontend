// Imported rather than served from public/: with `base: "./"`, a
// "./assets/..." URL resolves against the page path and breaks whenever the
// app is opened below the root.
import alipay from "./alipay.svg";
import alipay_f2f from "./alipay_f2f.svg";
import balance from "./balance.svg";
import wechat_pay from "./wechat_pay.svg";

export const paymentIcons = {
  alipay,
  alipay_f2f,
  balance,
  wechat_pay,
};
