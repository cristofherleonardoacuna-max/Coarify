import { Heart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '../context/AppContext';
import Button from './common/Button';
import ResultList from './ResultList';
import { SectionTitle } from './HomePage';

/** Canciones marcadas con corazon. Se guardan en este navegador. */
export function FavoritesPage() {
  const { favorites } = useApp();
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <SectionTitle
        icon={Heart}
        title="Favoritos"
        hint={`${favorites.length} ${favorites.length === 1 ? 'cancion' : 'canciones'}`}
      />

      <ResultList
        tracks={favorites}
        emptyIcon={Heart}
        emptyTitle="Todavia no tienes favoritos"
        emptyDescription="Pulsa el corazon en cualquier cancion para guardarla aqui."
        emptyAction={
          <Button variant="accent" size="sm" onClick={() => navigate('/')}>
            <Search size={14} />
            Buscar musica
          </Button>
        }
      />
    </div>
  );
}

export default FavoritesPage;
