<template>
  <v-container fluid>
    <v-layout>
      <v-flex xs10>
         <v-layout row wrap>
            <v-flex xs12 v-if="boardsError">
                <v-alert :value="boardsError" type="error">
                  {{boardsError.message}}
                </v-alert>
              </v-flex>
            <v-progress-circular
                v-if="loadingBoard || loadingLists"
                :size="70"
                :width="7"
                indeterminate color="primary">
            </v-progress-circular>
            <v-flex xs12>
              <v-layout row wrap>
                <v-flex xs12 v-if="!boardsError">
                  <h2 v-if="board">{{board.name}}</h2>
                </v-flex>
                <v-flex v-if="!loadingLists" sm3 v-for="list in lists" :key="list._id" pa-2>
                  <v-card @dragover="setDroppingList($event, list)" :class="{ 'light-blue lighten-3': droppingList == list }">
                    <v-card-title primary-title>
                      <v-layout column>
                        <v-flex xs12>
                          <div class="headline">{{list.name}}</div>
                        </v-flex>
                        <v-flex xs12 v-if="cardsByListId[list._id]" v-for="card in cardsByListId[list._id]" :key="card._id" class="pa-1">
                          <v-card draggable="true" @dragstart="startDraggingCard(card)" @dragend="dropCard()">
                              <v-container fluid grid-list-lg>
                                <v-layout row>
                                  <v-flex xs12>
                                    <div>
                                      <div class="headline">
                                        {{card.title}}
                                        <v-btn type="submit" @click="removeCard(card)">Delete</v-btn>
                                      </div>
                                    </div>
                                  </v-flex>
                                </v-layout>
                              </v-container>
                          </v-card>
                        </v-flex>
                      </v-layout>
                    </v-card-title>
                    <v-card-actions>
                      <create-card
                        :user="user.user"
                        :createActivity="createActivity"
                        :listId="list._id"
                        :boardId="$route.params.id">
                      </create-card>
                    </v-card-actions>
                  </v-card>
                </v-flex>
                <v-flex sm3 pa-2>
                  <v-card>
                    <v-card-title primary-title style="flex-direction: column">
                      <div class="headline">Create List</div>
                      <div>
                        <v-form
                          v-if="!creatingList"
                          v-model="validList"
                          @submit.prevent="createList"
                          @keydown.prevent.enter>
                          <v-text-field
                            v-model="list.name"
                            :rules="notEmptyRules"
                            label="Name"
                            required>
                          </v-text-field>
                          <v-btn type="submit" :disabled="!validList">Create List</v-btn>
                        </v-form>
                        <v-progress-circular
                          v-if="creatingList"
                          :size="70"
                          :width="7"
                          indeterminate color="primary">
                        </v-progress-circular>
                      </div>
                  </v-card-title>
                  </v-card>
                </v-flex>
              </v-layout>
            </v-flex>
          </v-layout>
      </v-flex>
      <v-flex xs2>
        <v-layout row fill-height style="align-items:stretch;">
          <v-flex xs12>
            <v-card height="100%">
              <v-card-title primary-title>
                <div>
                  <h3 class="headline mb-0">Activities</h3>
                </div>
              </v-card-title>
              <v-list three-line>
                <v-list-tile
                  v-for="activity in activitiesByDate"
                  :key="activity._id">
                  <v-list-tile-action>
                    <v-icon color="pink">local_activity</v-icon>
                  </v-list-tile-action>
                  <v-list-tile-content>
                    <!-- <v-list-tile-title v-text="activity.userId"></v-list-tile-title> -->
                    <v-list-tile-sub-title v-html="markdownify(activity.text)"></v-list-tile-sub-title>
                  </v-list-tile-content>
                </v-list-tile>
              </v-list>
            </v-card>
          </v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import { notEmptyRules } from '@/validator';
import CreateCard from './CreateCard';
import marked from 'marked';

export default {
  name: 'board',
  components: {
    CreateCard,
  },
  data: () => ({
    activitiesOpen: true,
    draggingCard: null,
    droppingList: null,
    board: {},
    validList: false,
    list: {
      name: '',
      order: 0,
      archived: false,
    },
    notEmptyRules,
  }),
  mounted() {
    this.getBoard(this.$route.params.id)
      .then((response) => {
        this.board = response.data || response;
      });

    this.findLists({
      query: {
        boardId: this.$route.params.id,
      },
    })
      .then((response) => {
        const lists = response.data || response;
      });

    this.findCards({
      query: {
        boardId: this.$route.params.id,
      },
    })
      .then((response) => {
        const cards = response.data || response;
      });

    this.findActivities({
      query: {
        boardId: this.$route.params.id,
      },
    })
      .then((response) => {
        const activities = response.data || response;
      });
  },
  methods: {
    ...mapActions('boards', { getBoard: 'get' }),
    ...mapActions('lists', { findLists: 'find' }),
    ...mapActions('cards', { findCards: 'find' }),
    ...mapActions('activities', { findActivities: 'find' }),

    async createList() {
      if (this.validList) {
        const { List } = this.$FeathersVuex;
        this.list.boardId = this.$route.params.id;
        const list = new List(this.list);
        await list.save();
        this.list = {
          name: '',
          order: 0,
          archived: false,
        };
        this.createActivity(`**${this.user.user.displayName}** created list **${list.name}**`);
      }
    },
    createActivity(text) {
      const { Activity } = this.$FeathersVuex;
      const activity = new Activity();
      activity.text = text;
      activity.boardId = this.$route.params.id;
      activity.save();
    },
    startDraggingCard(card) {
      this.draggingCard = card;
    },
    setDroppingList(event, list) {
      this.droppingList = list;
      event.preventDefault();
    },
    async dropCard() {
      if (this.droppingList) {
        if (this.draggingCard.listId !== this.droppingList._id) {
          const fromList = this.lists.find(list => list._id === this.draggingCard.listId);
          const toList = this.lists.find(list => list._id === this.droppingList._id);
          this.draggingCard.listId = this.droppingList._id;
          await this.draggingCard.save();
          this.createActivity(`**${this.user.user.displayName}** moved card **${this.draggingCard.title}** from **${fromList.name}** to **${toList.name}**`);
        }
      }
      this.droppingList = null;
      this.draggingCard = null;
    },
    markdownify(text) {
      return marked(text);
    },
    async removeCard(targetCard) {
      const cardId = targetCard._id;
      const targetCardIndex = this.cards.findIndex(card => card._id === cardId);
      const fromList = this.lists.find(list => list._id === targetCard.listId);

      this.cards.splice(targetCardIndex, 1);
      const { Card } = this.$FeathersVuex;
      const { List } = this.$FeathersVuex;

      const card = new Card({ _id: targetCard._id, title: targetCard.title });

      await card.save()
        .then((card) => {
          // console.log('successfully removed card', card)
          card.remove();
        })
        .catch((err) => {
          console.log(err);
        });
    },
  },
  computed: {
    ...mapState('auth', { user: 'payload' }),
    ...mapState('boards', {
      loadingBoard: 'isGetPending',
      boardsError: 'errorOnGet',
    }),
    ...mapState('lists', {
      loadingLists: 'isFindPending',
      creatingList: 'isCreatePending',
      listsError: 'errorOnFind',
    }),
    ...mapState('cards', {
      cardsError: 'errorOnFind',
    }),
    ...mapGetters('lists', { findListsInStore: 'find' }),
    ...mapGetters('cards', { findCardsInStore: 'find' }),
    ...mapGetters('activities', { findActivitiesInStore: 'find' }),

    activities() {
      return this.findActivitiesInStore({
        query: {
          boardId: this.$route.params.id,
        },
      }).data;
    },
    lists() {
      return this.findListsInStore({
        query: {
          boardId: this.$route.params.id,
        },
      }).data;
    },
    cards() {
      return this.findCardsInStore({
        query: {
          boardId: this.$route.params.id,
        },
      }).data;
    },
    cardsByListId() {
      return this.cards.reduce((byId, card) => {
        byId[card.listId] = byId[card.listId] || [];
        byId[card.listId].push(card);
        return byId;
      }, {});
    },
    activitiesByDate() {
      return this.activities.slice().reverse();
    },
  },
};
</script>
