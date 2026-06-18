/**
 * Schémas de validation Zod — SOURCE UNIQUE partagée entre le processus principal
 * (services : `schema.safeParse()`) et le renderer (formulaires : `zodResolver`).
 * Zod est du JS pur → fonctionne côté `main` comme côté `renderer`.
 * Les règles métier réutilisent le domaine pur (`src/domain/compte`).
 */
import { z } from 'zod';
import { isNumeroValide, classeFromNumero } from '../domain/compte';

/** Saisie d'un compte du plan comptable (sans id ni magasin_id). */
export const compteInputSchema = z
  .object({
    numero: z
      .string()
      .refine(isNumeroValide, 'Le numéro de compte doit comporter 2 à 8 chiffres.'),
    libelle: z.string().trim().min(1, "L'intitulé du compte est obligatoire."),
    classe: z.number().int().min(1).max(9),
    collectif: z.boolean(),
    lettrable: z.boolean(),
  })
  .refine((v) => v.classe === classeFromNumero(v.numero), {
    message: 'La classe doit correspondre au premier chiffre du numéro.',
    path: ['classe'],
  });

export type CompteFormValues = z.infer<typeof compteInputSchema>;

/** Premier message d'erreur d'un parse Zod échoué (pour l'enveloppe IpcResult). */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.';
}

/** Saisie d'une société (sans id). */
export const societeInputSchema = z.object({
  raison_sociale: z.string().trim().min(1, 'La raison sociale est obligatoire.'),
  rccm: z.string().trim(),
  adresse: z.string().trim(),
  telephone: z.string().trim(),
});
export type SocieteFormValues = z.infer<typeof societeInputSchema>;

/** Saisie d'un magasin (sans id). */
export const magasinInputSchema = z.object({
  libelle: z.string().trim().min(1, 'Le libellé du magasin est obligatoire.'),
  societe_id: z.number().int().positive('La société est obligatoire.'),
});
export type MagasinFormValues = z.infer<typeof magasinInputSchema>;
