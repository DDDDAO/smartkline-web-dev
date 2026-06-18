import {
  redirectToTopSignalsKolPanel,
  type LegacyKolRoutePageProps,
} from "../legacy-kol-route";

export default async function KolPage(props: LegacyKolRoutePageProps) {
  await redirectToTopSignalsKolPanel(props);
}
