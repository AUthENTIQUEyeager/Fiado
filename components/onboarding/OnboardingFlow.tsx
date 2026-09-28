"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, registerAccount } from "@/lib/auth-context";
import { createMerchantFromOnboarding } from "@/lib/repo";

type SurveyKey = "q1" | "q2" | "q3";

interface SurveyStep {
  type: "survey";
  key: SurveyKey;
  question: string;
  options: string[];
}

const SURVEY_STEPS: SurveyStep[] = [
  {
    type: "survey",
    key: "q1",
    question: "As-tu deja perdu de l'argent a cause d'un client qui n'a pas paye ?",
    options: ["Oui, souvent", "Ca arrive", "Jamais"],
  },
  {
    type: "survey",
    key: "q2",
    question: "Combien de temps tu passes a courir apres tes debiteurs chaque semaine ?",
    options: ["Moins d'1h", "Quelques heures", "Beaucoup trop"],
  },
  {
    type: "survey",
    key: "q3",
    question: "Tu voudrais savoir si un client est fiable avant de lui vendre a credit ?",
    options: ["Oui carrement", "Peut-etre", "Pas besoin"],
  },
];

type Step = "survey1" | "survey2" | "survey3" | "value_prop" | "business_name" | "market" | "phone" | "email";

const STEP_ORDER: Step[] = ["survey1", "survey2", "survey3", "value_prop", "business_name", "market", "phone", "email"];

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { refresh } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<SurveyKey, string>>({ q1: "", q2: "", q3: "" });
  const [businessName, setBusinessName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [city, setCity] = useState("Bobo-Dioulasso");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEP_ORDER[stepIndex];

  const advance = () => {
    setDirection(1);
    setError(null);
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const answerSurvey = (key: SurveyKey, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    advance();
  };

  // Remplace l'ancien couple sendPhoneOtp/confirmOtp (code WhatsApp) : plus
  // de code a envoyer ni a saisir, juste une verification de doublon en
  // base (voir lib/auth-context.tsx, registerAccount) avant de creer le
  // compte directement.
  const confirmEmail = async () => {
    if (!email.trim().includes("@")) {
      setError("Entre un email valide.");
      return;
    }
    setSubmitting(true);
    const result = await registerAccount(phone.trim(), email.trim());
    if (!result.ok) {
      setError(result.error ?? "Impossible de creer le compte, reessaie.");
      setSubmitting(false);
      return;
    }
    await createMerchantFromOnboarding({
      businessName: businessName.trim(),
      marketName: marketName.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      survey: answers,
    });
    await refresh();
    router.replace(next);
  };

  return (
    <main className="flex min-h-screen flex-col bg-forest-900 text-forest-50">
      <div className="flex items-center gap-3 px-5 pt-6">
        {stepIndex > 0 && (
          <button type="button" onClick={goBack} aria-label="Retour" className="text-forest-100">
            ←
          </button>
        )}
        <div className="flex flex-1 gap-1">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-gold-400" : "bg-forest-700"}`}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-10">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === "survey1" && (
              <SurveyPanel step={SURVEY_STEPS[0]} onAnswer={(v) => answerSurvey("q1", v)} />
            )}
            {step === "survey2" && (
              <SurveyPanel step={SURVEY_STEPS[1]} onAnswer={(v) => answerSurvey("q2", v)} />
            )}
            {step === "survey3" && (
              <SurveyPanel step={SURVEY_STEPS[2]} onAnswer={(v) => answerSurvey("q3", v)} />
            )}

            {step === "value_prop" && (
              <div>
                <h1 className="font-display text-2xl font-semibold leading-snug">
                  FIADO t&apos;aide a ne plus jamais perdre cet argent.
                </h1>
                <ul className="mt-6 space-y-4 text-sm text-forest-50/90">
                  <li>— Un carnet de credit qui se remplit en quelques secondes</li>
                  <li>— Des relances envoyees automatiquement sur WhatsApp</li>
                  <li>— La fiabilite d&apos;un client verifiable avant de lui vendre a credit</li>
                </ul>
                <PrimaryButton onClick={advance}>Continuer</PrimaryButton>
              </div>
            )}

            {step === "business_name" && (
              <TextStep
                label="Le nom de ta boutique"
                value={businessName}
                onChange={setBusinessName}
                placeholder="Ex. Tissus Fatoumata"
                onNext={advance}
                disabled={businessName.trim().length < 2}
              />
            )}

            {step === "market" && (
              <div>
                <h1 className="font-display text-xl font-semibold">Ou se trouve ta boutique ?</h1>
                <input
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  placeholder="Marche (ex. Marche central)"
                  className="mt-6 w-full rounded-xl bg-forest-800 px-4 py-3 text-forest-50 placeholder:text-forest-100/50 outline-none"
                />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ville"
                  className="mt-3 w-full rounded-xl bg-forest-800 px-4 py-3 text-forest-50 placeholder:text-forest-100/50 outline-none"
                />
                <PrimaryButton onClick={advance} disabled={marketName.trim().length < 2}>
                  Continuer
                </PrimaryButton>
              </div>
            )}

            {step === "phone" && (
              <TextStep
                label="Ton numero de telephone"
                value={phone}
                onChange={setPhone}
                placeholder="+226 70 00 00 00"
                onNext={advance}
                disabled={phone.trim().length < 8}
              />
            )}

            {step === "email" && (
              <div>
                <h1 className="font-display text-xl font-semibold">Ton adresse email</h1>
                <p className="mt-1 text-xs text-forest-100/70">
                  Utile pour te reconnecter depuis un autre appareil — pas de code a saisir, on verifie juste que
                  telephone et email correspondent.
                </p>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com"
                  inputMode="email"
                  type="email"
                  className="mt-6 w-full rounded-xl bg-forest-800 px-4 py-3 text-forest-50 placeholder:text-forest-100/50 outline-none"
                />
                {error && <p className="mt-2 text-xs text-alert-100">{error}</p>}
                <PrimaryButton onClick={confirmEmail} disabled={submitting || !email.trim()}>
                  {submitting ? "Creation du compte..." : "Valider"}
                </PrimaryButton>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

function SurveyPanel({ step, onAnswer }: { step: SurveyStep; onAnswer: (value: string) => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold leading-snug">{step.question}</h1>
      <div className="mt-8 space-y-3">
        {step.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(option)}
            className="w-full rounded-xl border border-forest-100/20 bg-forest-800 px-4 py-3.5 text-left text-forest-50 transition-colors active:bg-forest-700"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextStep({
  label,
  value,
  onChange,
  placeholder,
  onNext,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h1 className="font-display text-xl font-semibold">{label}</h1>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-6 w-full rounded-xl bg-forest-800 px-4 py-3 text-forest-50 placeholder:text-forest-100/50 outline-none"
      />
      <PrimaryButton onClick={onNext} disabled={disabled}>
        Continuer
      </PrimaryButton>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-8 w-full rounded-xl bg-gold-400 py-3.5 font-medium text-forest-900 transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}
