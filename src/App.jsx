import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Play, Pause, SkipForward, Settings, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Parser from 'rss-parser'
import './App.css'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState([])
  const [rssUrl, setRssUrl] = useState('')
  const [rssItems, setRssItems] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [isLoadingRss, setIsLoadingRss] = useState(false)
  const [playlists, setPlaylists] = useState({})
  const [currentPlaylistName, setCurrentPlaylistName] = useState('default')
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const [newItem, setNewItem] = useState({
    type: 'image',
    url: '',
    duration: 5000,
    title: ''
  })

  const [showHeader, setShowHeader] = useState(true)

  useEffect(() => {
    const savedPlaylists = localStorage.getItem('playlists')
    const savedCurrentPlaylist = localStorage.getItem('currentPlaylist')
    
    try {
      if (savedPlaylists) {
        const parsedPlaylists = JSON.parse(savedPlaylists)
        setPlaylists(parsedPlaylists)
        
        const playlistName = savedCurrentPlaylist || 'default'
        setCurrentPlaylistName(playlistName)
        
        if (parsedPlaylists[playlistName] && Array.isArray(parsedPlaylists[playlistName])) {
          setItems(parsedPlaylists[playlistName])
        }
      } else {
        // Migrar playlist antiga se existir
        const oldPlaylist = localStorage.getItem('playlist')
        if (oldPlaylist) {
          const parsed = JSON.parse(oldPlaylist)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newPlaylists = { default: parsed }
            setPlaylists(newPlaylists)
            setItems(parsed)
            localStorage.setItem('playlists', JSON.stringify(newPlaylists))
            localStorage.removeItem('playlist')
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar playlists:', err)
    }
  }, [])

  useEffect(() => {
    const updatedPlaylists = { ...playlists, [currentPlaylistName]: items }
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    localStorage.setItem('currentPlaylist', currentPlaylistName)
  }, [items, currentPlaylistName])

  // Função para detectar se é um RSS ticker do rss.app
  const isRssTicker = (url) => {
    return url.includes('rss.app/embed/v1/ticker/') || url.includes('rss.app/embed/v1/marquee/')
  }

  const addItem = () => {
    if (newItem.url.trim()) {
      let itemType = newItem.type
      
      // Auto-detectar RSS tickers
      if (isRssTicker(newItem.url)) {
        itemType = 'rss-ticker'
      }
      
      setItems([...items, { ...newItem, type: itemType, id: Date.now() }])
      setNewItem({
        type: 'image',
        url: '',
        duration: 5000,
        title: ''
      })
    }
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
    if (currentIndex >= items.length - 1) {
      setCurrentIndex(0)
    }
  }

  const clearPlaylist = () => {
    setItems([])
    setCurrentIndex(0)
    const updatedPlaylists = { ...playlists, [currentPlaylistName]: [] }
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
  }

  const createPlaylist = () => {
    if (newPlaylistName.trim() && !playlists[newPlaylistName.trim()]) {
      const playlistName = newPlaylistName.trim()
      const updatedPlaylists = { ...playlists, [playlistName]: [] }
      setPlaylists(updatedPlaylists)
      setCurrentPlaylistName(playlistName)
      setItems([])
      setCurrentIndex(0)
      setNewPlaylistName('')
      localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
      localStorage.setItem('currentPlaylist', playlistName)
    }
  }

  const switchPlaylist = (playlistName) => {
    if (playlists[playlistName]) {
      setCurrentPlaylistName(playlistName)
      setItems(playlists[playlistName] || [])
      setCurrentIndex(0)
      localStorage.setItem('currentPlaylist', playlistName)
    }
  }

  const deletePlaylist = (playlistName) => {
    if (playlistName === 'default') return // Não permitir deletar a playlist padrão
    
    const updatedPlaylists = { ...playlists }
    delete updatedPlaylists[playlistName]
    setPlaylists(updatedPlaylists)
    
    if (currentPlaylistName === playlistName) {
      setCurrentPlaylistName('default')
      setItems(playlists['default'] || [])
      setCurrentIndex(0)
      localStorage.setItem('currentPlaylist', 'default')
    }
    
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
  }

  const fetchRSS = async () => {
    if (!rssUrl.trim()) return

    setIsLoadingRss(true)
    try {
      // Se for um RSS Ticker do rss.app, não tentamos parsear como XML
      if (isRssTicker(rssUrl)) {
        setRssItems([{ 
          title: 'RSS Ticker detectado',
          link: rssUrl,
          description: 'Este é um widget ticker do rss.app. Adicione-o como conteúdo para visualizar.'
        }])
        setIsLoadingRss(false)
        return
      }

      const parser = new Parser({
        customFields: {
          item: ['description', 'content:encoded']
        }
      })

      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
      const response = await fetch(proxyUrl)
      const data = await response.json()

      if (data.contents.includes("<rss")) {
        const feed = await parser.parseString(data.contents)
        const items = feed.items.slice(0, 10).map(item => ({
          title: item.title || 'Sem título',
          link: item.link || '#',
          pubDate: item.pubDate || ''
        }))
        setRssItems(items)
      } else {
        // Se não for XML, assume que é embed genérico
        setRssItems([{ 
          title: 'Conteúdo embed detectado',
          link: rssUrl,
          description: 'Este URL não é um feed RSS tradicional. Adicione-o como tipo "Site" ou "RSS Ticker" na aba Conteúdo para visualizá-lo.'
        }])
      }
    } catch (error) {
      console.error('Erro ao buscar RSS:', error)
      const mockRssItems = [
        { title: 'Erro ao carregar RSS - Usando dados de exemplo', link: '#' },
        { title: 'Notícia 1: Lorem ipsum dolor sit amet', link: '#' },
        { title: 'Notícia 2: Consectetur adipiscing elit', link: '#' },
        { title: 'Notícia 3: Sed do eiusmod tempor incididunt', link: '#' }
      ]
      setRssItems(mockRssItems)
    } finally {
      setIsLoadingRss(false)
    }
  }

  const addRssAsContent = (rssItem) => {
    const itemType = isRssTicker(rssItem.link) ? 'rss-ticker' : 'website'
    const newRssItem = {
      type: itemType,
      url: rssItem.link,
      duration: 10000, // 10 segundos padrão para RSS
      title: rssItem.title,
      id: Date.now()
    }
    setItems([...items, newRssItem])
  }

  // Separar itens RSS ticker dos itens de conteúdo principal
  const contentItems = items.filter(item => item.type !== 'rss-ticker')
  const rssTickerItem = items.find(item => item.type === 'rss-ticker')

  // Usar apenas os itens de conteúdo para navegação
  const currentItem = contentItems[currentIndex]

  const renderContent = () => {
    if (!currentItem) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Nenhum conteúdo adicionado</h2>
            <p>Adicione slides, imagens, sites ou RSS tickers para começar</p>
          </div>
        </div>
      )
    }

    switch (currentItem.type) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={currentItem.url}
              alt={currentItem.title || 'Imagem'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )
      case 'website':
        return (
          <iframe
            src={currentItem.url}
            className="w-full h-full border-0"
            title={currentItem.title || 'Website'}
          />
        )
      case 'slide':
        return (
          <div className="flex items-center justify-center h-full">
            <embed
              src={currentItem.url}
              type="application/pdf"
              className="w-full h-full"
            />
          </div>
        )
      case 'spreadsheet':
        return (
          <iframe
            src={currentItem.url}
            className="w-full h-full border-0"
            title={currentItem.title || 'Planilha'}
          />
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Tipo de conteúdo não suportado</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Botão de toggle no canto superior direito */}
      {!showHeader && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeader(true)}
            className="bg-background/90 backdrop-blur-sm shadow-lg"
            title="Mostrar controles"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {showHeader && (
        <div className="bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Sala de Espera</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={contentItems.length === 0}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % contentItems.length)}
                  disabled={contentItems.length === 0}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHeader(false)}
                title="Ocultar controles"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {contentItems.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              {currentIndex + 1} de {contentItems.length} – {currentItem?.title || currentItem?.url}
              {rssTickerItem && (
                <span className="ml-2 text-green-600">• RSS Ticker ativo</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex relative">
        <div className="flex-1 bg-muted/20">
          {renderContent()}
        </div>

        {/* RSS Ticker na parte inferior - apenas se existir */}
        {rssTickerItem && (
          <div className="absolute bottom-0 left-0 w-full h-20 z-30 bg-black/90 backdrop-blur-sm">
            <iframe
              src={rssTickerItem.url}
              className="w-full h-full border-0"
              title={rssTickerItem.title || 'RSS Ticker'}
              style={{
                backgroundColor: 'transparent',
                border: 'none'
              }}
            />
          </div>
        )}

        {showSettings && (
          <div className="w-96 bg-card border-l p-4 overflow-y-auto">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="rss">RSS</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Gerenciar Playlists</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="current-playlist">Playlist Atual</Label>
                      <Select value={currentPlaylistName} onValueChange={switchPlaylist}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(playlists).map(name => (
                            <SelectItem key={name} value={name}>
                              {name} ({playlists[name]?.length || 0} itens)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome da nova playlist"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && createPlaylist()}
                      />
                      <Button onClick={createPlaylist} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {currentPlaylistName !== 'default' && (
                      <Button 
                        onClick={() => deletePlaylist(currentPlaylistName)} 
                        variant="destructive" 
                        size="sm"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar Playlist "{currentPlaylistName}"
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Adicionar Conteúdo</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={newItem.type} onValueChange={(value) => setNewItem({ ...newItem, type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="website">Site</SelectItem>
                          <SelectItem value="rss-ticker">RSS Ticker</SelectItem>
                          <SelectItem value="slide">Slide (PDF)</SelectItem>
                          <SelectItem value="spreadsheet">Planilha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        value={newItem.url}
                        onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                        placeholder="https://..."
                      />
                      {newItem.url && isRssTicker(newItem.url) && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ RSS Ticker detectado automaticamente
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="title">Título (opcional)</Label>
                      <Input
                        id="title"
                        value={newItem.title}
                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        placeholder="Título do conteúdo"
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duração (segundos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newItem.duration / 1000}
                        onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) * 1000 })}
                        min="1"
                      />
                    </div>

                    <Button onClick={addItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Playlist: {currentPlaylistName}</h3>
                      <Button onClick={clearPlaylist} variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        // Calcular o índice correto para itens de conteúdo
                        const contentItemIndex = contentItems.findIndex(contentItem => contentItem.id === item.id)
                        const isCurrentContentItem = contentItemIndex === currentIndex && item.type !== 'rss-ticker'
                        
                        return (
                          <Card key={item.id} className={`p-3 ${isCurrentContentItem ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {item.title || item.url}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.type} • {item.duration / 1000}s
                                  {item.type === 'rss-ticker' && (
                                    <span className="ml-1 text-green-600">• Ticker ativo</span>
                                  )}
                                </p>
                              </div>
                              <Button
                                onClick={() => removeItem(item.id)}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rss" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Buscar RSS Feed</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="rss-url">URL do RSS ou Ticker</Label>
                      <Input
                        id="rss-url"
                        value={rssUrl}
                        onChange={(e) => setRssUrl(e.target.value)}
                        placeholder="https://rss.app/embed/v1/ticker/..."
                      />
                      {rssUrl && isRssTicker(rssUrl) && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ RSS Ticker do rss.app detectado
                        </p>
                      )}
                    </div>
                    <Button onClick={fetchRSS} disabled={isLoadingRss} className="w-full">
                      {isLoadingRss ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Buscar RSS'
                      )}
                    </Button>
                  </div>
                </div>

                {rssItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Itens Encontrados</h3>
                    <div className="space-y-2">
                      {rssItems.map((item, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium line-clamp-2">
                              {item.title}
                            </h4>
                            {item.pubDate && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.pubDate).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            <Button
                              size="sm"
                              onClick={() => addRssAsContent(item)}
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar à Playlist
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

