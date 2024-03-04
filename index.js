import React, { Component } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  AsyncStorage,
  FlatList,
} from "react-native";
import emoji from "emoji-datasource";
import i18n from "../../translator/i18n";
import { TEXT } from "../../styles/Typographie";
import COLORS from "../../styles/COLORS";

export const Categories = {
  all: {
    symbol: null,
    name: "All",
  },
  history: {
    symbol: "🕘",
    name: "Recently used",
  },
  emotion: {
    symbol: "😀",
    name: "Smileys & Emotion",
  },
  people: {
    symbol: "🧑",
    name: "People & Body",
  },
  nature: {
    symbol: "🐻",
    name: "Animals & Nature",
  },
  food: {
    symbol: "🍔",
    name: "Food & Drink",
  },
  activities: {
    symbol: "⚾️",
    name: "Activities",
  },
  places: {
    symbol: "✈️",
    name: "Travel & Places",
  },
  objects: {
    symbol: "💡",
    name: "Objects",
  },
  symbols: {
    symbol: "🔣",
    name: "Symbols",
  },
  flags: {
    symbol: "🚩",
    name: "Flags",
  },
};

const charFromUtf16 = (utf16) =>
  String.fromCodePoint(...utf16.split("-").map((u) => "0x" + u));
export const charFromEmojiObject = (obj) => charFromUtf16(obj.unified);
const filteredEmojis = emoji.filter((e) => !e["obsoleted_by"]);
const emojiByCategory = (category) =>
  filteredEmojis.filter((e) => e.category === category);
const sortEmoji = (list) => list.sort((a, b) => a.sort_order - b.sort_order);
const categoryKeys = Object.keys(Categories);

const TabBar = ({ theme, activeCategory, onPress, width }) => {
  const tabSize = width / categoryKeys.length;

  return categoryKeys.map((c) => {
    const category = Categories[c];

    if (c !== "all")
      return (
        <TouchableOpacity
          key={category.name}
          onPress={() => onPress(category)}
          style={{
            flex: 1,
            height: tabSize,
            borderColor: category === activeCategory ? theme : "#EEEEEE",
            borderBottomWidth: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              textAlign: "center",
              paddingBottom: 8,
              fontSize: tabSize - 17,
            }}
          >
            {category.symbol}
          </Text>
        </TouchableOpacity>
      );
  });
};

const EmojiCell = ({ emoji, colSize, ...other }) => (
  <TouchableOpacity
    activeOpacity={0.5}
    style={{
      width: colSize,
      height: colSize,
      alignItems: "center",
      justifyContent: "center",
    }}
    {...other}
  >
    <Text style={{ color: "#FFFFFF", fontSize: colSize - 12 }}>
      {charFromEmojiObject(emoji)}
    </Text>
  </TouchableOpacity>
);

const storage_key = "@react-native-emoji-selector:HISTORY";
export default class EmojiSelector extends Component {
  state = {
    searchQuery: "",
    category: Categories.people,
    isReady: false,
    history: [],
    emojiList: null,
    colSize: 0,
    width: 0,
  };

  //
  //  HANDLER METHODS
  //
  handleTabSelect = (category) => {
    if (this.state.isReady) {
      if (this.scrollview)
        this.scrollview.scrollToOffset({ x: 0, y: 0, animated: false });
      this.setState({
        searchQuery: "",
        category,
      });
    }
  };

  handleEmojiSelect = (emoji) => {
    if (this.props.showHistory) {
      this.addToHistoryAsync(emoji);
    }
    this.props.onEmojiSelected(charFromEmojiObject(emoji));
  };

  handleSearch = (searchQuery) => {
    this.setState({ searchQuery });
  };

  addToHistoryAsync = async (emoji) => {
    let history = await AsyncStorage.getItem(storage_key);

    let value = [];
    if (!history) {
      // no history
      let record = Object.assign({}, emoji, { count: 1 });
      value.push(record);
    } else {
      let json = JSON.parse(history);
      if (json.filter((r) => r.unified === emoji.unified).length > 0) {
        value = json;
      } else {
        let record = Object.assign({}, emoji, { count: 1 });
        value = [record, ...json];
      }
    }

    AsyncStorage.setItem(storage_key, JSON.stringify(value));
    this.setState({
      history: value,
    });
  };

  loadHistoryAsync = async () => {
    let result = await AsyncStorage.getItem(storage_key);
    if (result) {
      let history = JSON.parse(result);
      this.setState({ history });
    }
  };

  //
  //  RENDER METHODS
  //
  renderEmojiCell = ({ item }) => (
    <EmojiCell
      key={item.key}
      emoji={item.emoji}
      onPress={() => this.handleEmojiSelect(item.emoji)}
      colSize={this.state.colSize}
    />
  );

  returnSectionData() {
    const { history, emojiList, searchQuery, category } = this.state;

    let emojiData = (function () {
      if (category === Categories.all && searchQuery === "") {
        //TODO: OPTIMIZE THIS
        let largeList = [];
        categoryKeys.forEach((c) => {
          const name = Categories[c].name;
          const list =
            name === Categories.history.name ? history : emojiList[name];
          if (c !== "all" && c !== "history")
            largeList = largeList.concat(list);
        });

        return largeList.map((emoji) => ({ key: emoji.unified, emoji }));
      } else {
        let list;
        const hasSearchQuery = searchQuery !== "";
        const name = category.name;
        if (hasSearchQuery) {
          const filtered = emoji.filter((e) => {
            let display = false;
            e.short_names.forEach((name) => {
              if (name.includes(searchQuery.toLowerCase())) display = true;
            });
            return display;
          });
          list = sortEmoji(filtered);
        } else if (name === Categories.history.name) {
          list = history;
        } else {
          list = emojiList[name];
        }
        return list.map((emoji) => ({ key: emoji.unified, emoji }));
      }
    })();

    // Check if the emojiData array is empty
    if (emojiData.length === 0 && searchQuery !== "") {
      return <Text>Not Found </Text>;
    }

    return this.props.shouldInclude
      ? emojiData.filter((e) => this.props.shouldInclude(e.emoji))
      : emojiData;
  }

  prerenderEmojis(callback) {
    let emojiList = {};
    categoryKeys.forEach((c) => {
      let name = Categories[c].name;
      emojiList[name] = sortEmoji(emojiByCategory(name));
    });

    this.setState(
      {
        emojiList,
        colSize: Math.floor(this.state.width / this.props.columns),
      },
      callback
    );
  }

  handleLayout = ({ nativeEvent: { layout } }) => {
    this.setState({ width: layout.width }, () => {
      this.prerenderEmojis(() => {
        this.setState({ isReady: true });
      });
    });
  };

  //
  //  LIFECYCLE METHODS
  //
  componentDidMount() {
    const { category, showHistory } = this.props;
    this.setState({ category });

    if (showHistory) {
      this.loadHistoryAsync();
    }
  }

  render() {
    const {
      theme,
      columns,
      placeholder,
      showHistory,
      showSearchBar,
      showSectionTitles,
      showTabs,
      ...other
    } = this.props;

    const { category, colSize, isReady, searchQuery } = this.state;

    const Searchbar = (
      <View style={styles.searchbar_container}>
        <TextInput
          style={styles.search}
          placeholder={placeholder}
          clearButtonMode="always"
          returnKeyType="done"
          autoCorrect={false}
          underlineColorAndroid={theme}
          value={searchQuery}
          onChangeText={this.handleSearch}
        />
      </View>
    );
    const { t } = i18n;
    const categoryTitle = t(`emoji${category.name}`);

    const title = searchQuery !== "" ? "Search Results" : categoryTitle;

    let emojiSectionContent;

    if (isReady) {
      const emojiData = this.returnSectionData();

      if (emojiData.length > 0) {
        emojiSectionContent = (
          <View style={{ flex: 1 }}>
            <View style={styles.container}>
              {showSectionTitles && (
                <Text style={styles.sectionHeader}>{title}</Text>
              )}
              <FlatList
                style={styles.scrollview}
                contentContainerStyle={{ paddingBottom: colSize }}
                data={emojiData}
                renderItem={this.renderEmojiCell}
                horizontal={false}
                numColumns={columns}
                keyboardShouldPersistTaps={"always"}
                ref={(scrollview) => (this.scrollview = scrollview)}
                removeClippedSubviews
              />
            </View>
          </View>
        );
      } else {
        emojiSectionContent = (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text style={[TEXT.h4, { color: COLORS.lightGray }]}>
              {t("emojiNotFound")}
            </Text>
          </View>
        );
      }
    } else {
      emojiSectionContent = (
        <View style={styles.loader} {...other}>
          <ActivityIndicator
            size={"large"}
            color={Platform.OS === "android" ? theme : "#000000"}
          />
        </View>
      );
    }

    return (
      <View style={styles.frame} {...other} onLayout={this.handleLayout}>
        <View style={styles.tabBar}>
          {showTabs && (
            <TabBar
              activeCategory={category}
              onPress={this.handleTabSelect}
              theme={theme}
              width={this.state.width}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {showSearchBar && Searchbar}
          {emojiSectionContent}
        </View>
      </View>
    );
  }
}

EmojiSelector.defaultProps = {
  theme: "#007AFF",
  category: Categories.all,
  showTabs: true,
  showSearchBar: true,
  showHistory: false,
  showSectionTitles: true,
  columns: 6,
  placeholder: "Search...",
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
  },
  scrollview: {
    flex: 1,
  },
  searchbar_container: {
    width: "100%",
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  search: {
    ...Platform.select({
      ios: {
        height: 36,
        paddingLeft: 8,
        borderRadius: 10,
        backgroundColor: "#E5E8E9",
      },
    }),
    margin: 8,
  },
  container: {
    flex: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sectionHeader: {
    margin: 8,
    fontSize: 17,
    width: "100%",
    color: "#8F8F8F",
  },
});
