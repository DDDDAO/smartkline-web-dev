import {
  redirectToTopSignalsKolPanel,
  type LegacyKolRoutePageProps,
} from "../legacy-kol-route";

export default async function KolSquarePage(props: LegacyKolRoutePageProps) {
  await redirectToTopSignalsKolPanel(props);
}
