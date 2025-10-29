'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Personagem } from '@/types/personagem';
import { Navbar } from '@/components/navbar';

export default function PersonagensPage() {
  const { id } = useParams<{ id: string }>();
  const [personagens, setPersonagens] = useState<Personagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPersonagens = async () => {
      try {
        const response = await fetch(`/api/campanhas/personagens/${id}`);
        if (!response.ok) throw new Error('Erro ao carregar personagens');
        const data: Personagem[] = await response.json();
        setPersonagens(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonagens();
  }, [id]);

  if (loading) return <div className="text-center mt-10">Carregando personagens...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">Erro: {error}</div>;

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Personagens dessa Campanha</h1>
        {personagens.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum personagem encontrado para esta campanha.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personagens.map((personagem, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {personagem.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Campanha ID: {personagem.campanha_id}</p>
                  {/* Adicione mais campos aqui, ex: <p>Classe: {personagem.classe}</p> */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}