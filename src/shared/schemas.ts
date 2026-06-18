/**
 * Schémas de validation Zod — SOURCE UNIQUE partagée entre le processus principal
 * (services : `schema.safeParse()`) et le renderer (formulaires : `zodResolver`).
 * Zod est du JS pur → fonctionne côté `main` comme côté `renderer`.
 * Les règles métier réutilisent le domaine pur (`src/domain/compte`).
 */
import { z } from 'zod';
import { isNumeroValide, classeFromNumero } from '../domain/compte';
import { isJournalType } from '../domain/journal';

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

/** Saisie d'un journal comptable (sans id ni magasin_id). */
export const journalInputSchema = z.object({
  code: z.string().trim().min(1, 'Le code du journal est obligatoire.').max(8, 'Code trop long (8 max).'),
  libelle: z.string().trim().min(1, 'Le libellé du journal est obligatoire.'),
  type: z.string().refine(isJournalType, 'Type de journal invalide.'),
  active: z.boolean(),
});
export type JournalFormValues = z.infer<typeof journalInputSchema>;

/** Saisie d'un tiers (sans id, magasin_id, comptes et archived). */
export const tiersInputSchema = z
  .object({
    code: z.string().trim().min(1, 'Le code du tiers est obligatoire.').max(20, 'Code trop long (20 max).'),
    raison_sociale: z.string().trim().min(1, 'La raison sociale est obligatoire.'),
    est_client: z.boolean(),
    est_fournisseur: z.boolean(),
    telephone: z.string().trim(),
    adresse: z.string().trim(),
    registre_commerce: z.string().trim(),
    plafond_credit: z.number().int().min(0, 'Le plafond doit être positif.'),
    bloque: z.boolean(),
  })
  .refine((v) => v.est_client || v.est_fournisseur, {
    message: 'Cochez « Client » et/ou « Fournisseur ».',
    path: ['est_client'],
  });
export type TiersFormValues = z.infer<typeof tiersInputSchema>;

/** Création d'un utilisateur. */
export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Le nom d'utilisateur est obligatoire.")
    .max(50, "Nom d'utilisateur trop long (50 max)."),
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim(),
  role: z.enum(['Admin', 'Comptable']),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum.'),
});
export type UserCreateFormValues = z.infer<typeof userCreateSchema>;

/** Modification d'un utilisateur (username et password hors scope). */
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim(),
  role: z.enum(['Admin', 'Comptable']),
  active: z.boolean(),
});
export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>;

/** Changement de mot de passe. */
export const passwordSchema = z.object({
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum.'),
});
export type PasswordFormValues = z.infer<typeof passwordSchema>;

/** Saisie d'une ligne d'écriture. */
export const ligneInputSchema = z
  .object({
    compte: z.string().trim().min(1, 'Compte obligatoire.'),
    tiers: z.string().trim().nullable(),
    libelle: z.string().trim(),
    debit: z.number().int().min(0),
    credit: z.number().int().min(0),
    echeance: z.string().nullable(),
    lettrage: z.string().nullable(),
  })
  .refine((l) => (l.debit > 0) !== (l.credit > 0), { message: 'Chaque ligne porte un débit OU un crédit.' });

/** Saisie d'une écriture comptable. */
export const ecritureInputSchema = z
  .object({
    exercice_id: z.number().int().positive(),
    journal: z.string().trim().min(1, 'Journal obligatoire.'),
    date_ecriture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
    libelle: z.string().trim().min(1, 'Libellé obligatoire.'),
    lignes: z.array(ligneInputSchema).min(2, 'Au moins 2 lignes.'),
  })
  .refine((e) => {
    const d = e.lignes.reduce((s, l) => s + l.debit, 0);
    const c = e.lignes.reduce((s, l) => s + l.credit, 0);
    return d === c && d > 0;
  }, { message: 'Écriture déséquilibrée (Σ débit ≠ Σ crédit).', path: ['lignes'] });

export type EcritureFormValues = z.infer<typeof ecritureInputSchema>;

/** Saisie d'un exercice comptable (sans id, magasin_id et statut). */
export const exerciceInputSchema = z
  .object({
    libelle: z.string().trim().min(1, 'Le libellé est obligatoire.'),
    date_debut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de début invalide (AAAA-MM-JJ).'),
    date_fin: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de fin invalide (AAAA-MM-JJ).'),
  })
  .refine((v) => v.date_debut <= v.date_fin, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['date_fin'],
  });
export type ExerciceFormValues = z.infer<typeof exerciceInputSchema>;
