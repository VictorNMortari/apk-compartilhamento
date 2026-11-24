import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useShareIntent } from 'expo-share-intent';

// Transforma o tamanho em bytes num texto legível (ex.: "2.4 MB")
function formatarTamanho(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function App() {
  // O hook avisa quando outro app (ex.: WhatsApp) compartilha algo com o nosso app.
  // O Android entrega esses dados por meio de uma "Intent" (ACTION_SEND).
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  // Lista com tudo que já foi recebido enquanto o app está aberto
  const [itens, setItens] = useState([]);

  useEffect(() => {
    if (!hasShareIntent) return;

    const novos = [];

    // Arquivos (fotos, PDFs, áudios, documentos...)
    if (shareIntent.files) {
      shareIntent.files.forEach((arquivo) => {
        novos.push({
          id: Date.now() + '-' + arquivo.path,
          tipo: 'arquivo',
          nome: arquivo.fileName,
          mimeType: arquivo.mimeType,
          tamanho: arquivo.size,
          caminho: arquivo.path,
        });
      });
    }

    // Texto ou link
    if (shareIntent.text) {
      novos.push({
        id: Date.now() + '-texto',
        tipo: 'texto',
        texto: shareIntent.text,
      });
    }

    // Coloca os novos itens no topo da lista
    setItens((anteriores) => [...novos, ...anteriores]);

    // Limpa a intent para não adicionar o mesmo item duas vezes
    resetShareIntent();
  }, [hasShareIntent]);

  function renderizarItem({ item }) {
    if (item.tipo === 'texto') {
      return (
        <View style={styles.card}>
          <Text style={styles.etiqueta}>TEXTO / LINK</Text>
          <Text style={styles.texto}>{item.texto}</Text>
        </View>
      );
    }

    const ehImagem = item.mimeType && item.mimeType.startsWith('image/');

    return (
      <View style={styles.card}>
        <Text style={styles.etiqueta}>ARQUIVO</Text>
        {ehImagem && <Image source={{ uri: item.caminho }} style={styles.imagem} />}
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.detalhe}>
          {item.mimeType} {formatarTamanho(item.tamanho)}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Itens recebidos</Text>

      {error && <Text style={styles.erro}>Erro: {error}</Text>}

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        renderItem={renderizarItem}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            Nada recebido ainda.{'\n\n'}
            Abra o WhatsApp (ou a galeria), toque em "Compartilhar" e escolha
            "App Compartilhamento".
          </Text>
        }
      />

      {itens.length > 0 && (
        <Pressable style={styles.botao} onPress={() => setItens([])}>
          <Text style={styles.botaoTexto}>Limpar lista</Text>
        </Pressable>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  etiqueta: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#25a35a',
    marginBottom: 6,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
  },
  detalhe: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  texto: {
    fontSize: 15,
  },
  imagem: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  vazio: {
    textAlign: 'center',
    color: '#666',
    marginTop: 60,
    fontSize: 15,
  },
  erro: {
    color: 'red',
    marginBottom: 10,
  },
  botao: {
    backgroundColor: '#25a35a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 16,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
