import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.1,
});

let currentProgress = 0;

export const startProgress = () => {
  currentProgress = 0;
  NProgress.start();
};

export const setProgress = (percent) => {
  currentProgress = percent / 100;
  NProgress.set(currentProgress);
};

export const doneProgress = () => {
  currentProgress = 1;
  NProgress.done();
};
