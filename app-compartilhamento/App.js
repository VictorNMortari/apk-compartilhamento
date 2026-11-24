import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';

// Transforma o tamanho em bytes num texto legível (ex.: "2.4 MB")
function formatarTamanho(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Abre o arquivo em outro app do celular (leitor de PDF, galeria, Excel...).
// Cria uma Intent ACTION_VIEW e deixa o Android escolher o app certo.
async function abrirArquivo(item) {
  try {
    // Outros apps não podem ler "file://" do nosso app. Por isso convertemos
    // o caminho num "content://", um link seguro que o Android entrega ao outro app.
    const arquivo = new File(item.caminho);

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: arquivo.contentUri,
      type: item.mimeType,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION: dá permissão de leitura ao outro app
    });
  } catch (e) {
    Alert.alert(
      'Não foi possível abrir',
      'Nenhum aplicativo do celular consegue abrir este tipo de arquivo.'
    );
  }
}

// Manda o arquivo para outro app (WhatsApp, e-mail, Drive...).
// Cria uma Intent ACTION_SEND, o mesmo caminho que o WhatsApp usou para mandar para nós.
async function compartilharArquivo(item) {
  try {
    await Sharing.shareAsync(item.caminho, {
      mimeType: item.mimeType,
      dialogTitle: 'Enviar para...',
    });
  } catch (e) {
    Alert.alert('Erro', 'Não foi possível compartilhar este arquivo.');
  }
}

export default function App() {
  // O hook avisa quando outro app (ex.: WhatsApp) compartilha algo com o nosso app.
  // O Android entrega esses dados por meio de uma "Intent" (ACTION_SEND).
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  // Lista com tudo que já foi recebido enquanto o app está aberto
  const [itens, setItens] = useState([]);

  // Imagem aberta em tela cheia (null = nenhuma)
  const [imagemAberta, setImagemAberta] = useState(null);

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
        link: shareIntent.webUrl, // link encontrado no texto (ou null)
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

          <View style={styles.acoes}>
            {item.link && (
              <Pressable style={styles.acao} onPress={() => Linking.openURL(item.link)}>
                <Text style={styles.acaoTexto}>Abrir link</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.acao, styles.acaoSecundaria]}
              onPress={() => Share.share({ message: item.texto })}
            >
              <Text style={[styles.acaoTexto, styles.acaoTextoSecundario]}>Compartilhar</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const ehImagem = item.mimeType && item.mimeType.startsWith('image/');

    return (
      <View style={styles.card}>
        <Text style={styles.etiqueta}>ARQUIVO</Text>

        {/* Tocar na imagem abre ela em tela cheia dentro do app */}
        {ehImagem && (
          <Pressable onPress={() => setImagemAberta(item.caminho)}>
            <Image source={{ uri: item.caminho }} style={styles.imagem} />
          </Pressable>
        )}

        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.detalhe}>
          {item.mimeType} {formatarTamanho(item.tamanho)}
        </Text>

        <View style={styles.acoes}>
          <Pressable style={styles.acao} onPress={() => abrirArquivo(item)}>
            <Text style={styles.acaoTexto}>Abrir</Text>
          </Pressable>
          <Pressable
            style={[styles.acao, styles.acaoSecundaria]}
            onPress={() => compartilharArquivo(item)}
          >
            <Text style={[styles.acaoTexto, styles.acaoTextoSecundario]}>Compartilhar</Text>
          </Pressable>
        </View>
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

      {/* Visualizador de imagem em tela cheia */}
      <Modal
        visible={imagemAberta !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setImagemAberta(null)} // botão "voltar" do Android
      >
        <Pressable style={styles.fundoModal} onPress={() => setImagemAberta(null)}>
          {imagemAberta && (
            <Image source={{ uri: imagemAberta }} style={styles.imagemCheia} />
          )}
          <Text style={styles.dicaFechar}>Toque para fechar</Text>
        </Pressable>
      </Modal>

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
  acoes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acao: {
    flex: 1,
    backgroundColor: '#25a35a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acaoSecundaria: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#25a35a',
  },
  acaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  acaoTextoSecundario: {
    color: '#25a35a',
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
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemCheia: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  dicaFechar: {
    color: '#ccc',
    marginTop: 16,
  },
});
