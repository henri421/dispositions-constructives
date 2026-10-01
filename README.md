# dispositions-constructives

Longueurs d'ancrage et de recouvrement des armatures de béton armé selon
l'EN 1992-1-1:2004, chapitre 8 : adhérence, coefficients α₁ à α₆, armatures de
couture, paquets de barres, diamètres de mandrin et ancrage des cadres.

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/dispositions-constructives/>.

> **Aide au calcul. L'outil constate, il ne prescrit pas** : il rend des
> longueurs et des sections, jamais un plan de ferraillage. La vérification
> finale et la responsabilité incombent à l'ingénieur du projet.

## Ce que l'outil rend

- **Adhérence** (§8.4.2) : f_bd = 2,25 η₁ η₂ f_ctd, avec f_ctk,0.05 **plafonné au C60/75**.
  Les conditions d'adhérence ne sont **jamais supposées** : déclarées, ou déduites de la
  position de coulage (figure 8.2). Le formulaire part sur « mauvaises ».
- **Longueur de référence** (§8.4.3) : σ_sd = f_yd (défaut), saisie, ou f_yd A_s,req / A_s,prov ;
  le résultat dit laquelle.
- **Ancrage** (§8.4.4) : c_d selon les trois configurations de la figure 8.3, α₁ à α₅ du tableau 8.2,
  **borne α₂α₃α₅ ≥ 0,7** (signalée quand elle s'active), l_b,min et la borne qui gouverne ;
  méthode simplifiée l_b,eq en option.
- Chaque coefficient porte son statut : **calculé**, **fixé par la norme** ou **non applicable**
  avec son motif — jamais un 1,0 muet.
- **Recouvrement** (§8.7.3) : α₆, l₀,min, α₃ avec ΣA_st,min = A_s σ_sd / f_yd ; **α₄ n'intervient pas**.
- **Armature de couture** (§8.7.4) : section totale et répartition dans les tiers extrêmes.
- **Paquets** (§8.9) : φ_n = φ √n_b ≤ 55 mm, n_b limité à 3 ou 4 selon le cas.
- **Mandrins** (§8.3, tableau 8.1N, et expression 8.1 dans le noyau) et **cadres** (§8.5, figure 8.5).
- **Synthèse par diamètre** (HA8 à HA32) aux conditions saisies, longueurs **calculées**.
- Sorties : croquis coté (SVG), CSV, note de calcul imprimable.

Une longueur disponible peut être saisie : le verdict devient conforme ou non conforme.
Sans elle, l'outil constate la longueur requise.

## Profil normatif

Valeurs recommandées (`ec2Recommande()`), chacune avec sa source. Le profil porte
**α_ct**, distinct de α_cc et soumis à l'annexe nationale, et les diamètres de mandrin du
tableau 8.1N. Aucune annexe nationale n'est codée.

## Hors périmètre

Dispositifs d'ancrage mécaniques (§8.8), ancrages de cadres par barres soudées
(figure 8.5 c et d), décalage des ancrages de paquets (§8.9.2), armatures de
précontrainte (§8.10), dispositions relatives des recouvrements (§8.7.2), qui relèvent
du dessin.

## Relation avec section-uls

Le plan d'origine plaçait ce module dans `section-uls`. Il vit dans son propre dépôt, au
prix d'une copie de `fctmDepuisFck` (même expression, tableau 3.1). La saisie part donc
d'un diamètre, pas d'une barre posée dans une section.

## Développement

```bash
npm install
npm run typecheck
npm test
npm run dev
```

Noyau pur dans `src/` (mm, mm², MPa, kN), interface dans `app/`, primitives communes de
[`aedificium-ui`](https://github.com/henri421/aedificium-ui). Cas résolu à la main :
[`docs/validation/ha16-c25.md`](docs/validation/ha16-c25.md).

## Licence

MIT — voir [LICENSE](LICENSE), sans garantie d'aucune sorte.
