export function renderHiddenSignalHint(input: {
  element: HTMLDivElement | null;
  isDarkTheme: boolean;
  isVisible: boolean | undefined;
}) {
  const { element, isDarkTheme, isVisible } = input;
  if (!element) {
    return;
  }

  element.classList.toggle("hidden", !isVisible);
  element.style.color = isDarkTheme ? "rgba(148, 163, 184, 0.96)" : "rgba(51, 65, 85, 0.92)";
}
