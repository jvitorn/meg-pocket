'use client'; // Necessário para usar hooks como useEffect no client-side

import Link from "next/link"
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Shadcn
import { Users } from 'lucide-react'; // Lucide
import { Campanha } from '@/types/campanha'; // Importe o tipo
import { Navbar } from '@/components/navbar';
import { LoadingSpinner } from "@/components/loadingSpinner";

export default function CampanhasPage() {
    const [campanhas, setCampanhas] = useState<Campanha[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCampanhas = async () => {
            try {
                const response = await fetch('/api/campanhas/all');
                if (!response.ok) throw new Error('Erro ao carregar campanhas');
                const data: Campanha[] = await response.json();
                setCampanhas(data);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchCampanhas();
    }, []);

    if (loading) return <LoadingSpinner/>;
    if (error) return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

    return (
        <>
           <Navbar/>
            <div className="min-h-screen mt-4 bg-gray-500 p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-center">Campanhas Ativas</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campanhas.map((campanha, index) => (
                            <Link key={index} href={`/personagens/campanha/${campanha._id}`}>
                            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        {campanha.nome} 
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600">
                                        Jogadores: {campanha.count_jogadores}
                                    </p>
                                </CardContent>
                            </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );

}