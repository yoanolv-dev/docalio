"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL = "contact@docalio.app";

/**
 * Formulaire de contact sans backend : il compose un e-mail pré-rempli et
 * l'ouvre dans le client mail de l'utilisateur (mailto). Simple et honnête.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Demande de démo Docalio — ${company || name || "Prospect"}`;
    const body = [
      `Nom : ${name}`,
      `Email : ${email}`,
      company ? `Société : ${company}` : null,
      "",
      message,
    ]
      .filter((line) => line !== null)
      .join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Camille Durand"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="camille@entreprise.fr"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company">Société (optionnel)</Label>
        <Input
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Entreprise SAS"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Votre besoin</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dites-nous comment vous partagez vos documents aujourd’hui."
          className="min-h-28"
          required
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        <Send className="h-4 w-4" />
        Envoyer ma demande
      </Button>
      <p className="text-xs text-muted-foreground">
        Votre logiciel de messagerie s’ouvrira avec un e-mail pré-rempli à
        destination de {CONTACT_EMAIL}.
      </p>
    </form>
  );
}
