"use client";

import { renderIcon, IconProps } from "@/components/render-icon";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/section-heading";
import { useEffect, useState } from "react";
import { SkeletonOverviewFeatures } from "@/components/skeletons/overview-features.skeleton"
interface FeatureCard {
  icon: IconProps["iconName"];
  title: string;
  description: string;
  colorIcon?: string;
}

interface OverviewFeaturesProps {
  title: string;
  subtitle: string;
  cards: FeatureCard[];
}

function OverviewFeatures({ title, subtitle, cards }: OverviewFeaturesProps) {
  const [isRendered, setIsRendered] = useState(false);
  useEffect(() => {
    // Considera o componente "renderizado" no próximo tick do loop de eventos
    const timeout = setTimeout(() => setIsRendered(true), 0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <section className="bg-background text-foreground py-16 px-6">
      <SectionHeading
        title={title}
        subtitle={subtitle}
        className="max-w-6xl mx-auto text-center mb-10"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
      {!isRendered ? (
        <>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonOverviewFeatures.Card key={i} />
        ))}
        </>
      ) : (
        <>
        {cards.map((card, index) => (
          <OverviewFeatureCard
            key={index}
            icon={card.icon}
            title={card.title}
            description={card.description}
            colorIcon={card.colorIcon}
          />
        ))}
        </>
        )}
      </div>
    </section>
  );
}

function OverviewFeatureCard({
  icon,
  title,
  description,
  colorIcon = "text-yellow-600",
}: FeatureCard) {
  return (
    <Card className="hover:shadow-lg transition">
      <CardHeader className="flex flex-col items-center justify-center text-center">
        {renderIcon(icon, cn("w-8 h-8 mb-2", colorIcon))}
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export {
  OverviewFeatures,
  OverviewFeatureCard,
};
