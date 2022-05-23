import numpy as np
import glob
import json
import os
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sklearn.metrics import mean_squared_error
from math import sqrt


# Get a list of the files in the directory and read them all into a numpy array
def readData():
    files = glob.glob('./training/*.json')

    path = pd.read_json(files[0])
    path.drop(['Percent Padded','MMSI'], axis= 1, inplace= True)
    path = pd.DataFrame((path['PathData'].values).squeeze().tolist(),columns=range(6))

    return path

# Output paths to json
def outputPaths(pred):
    dfPath = pd.DataFrame(pred)
    dfPath.reset_index(drop=True, inplace=True)
    MMSI = str(123456789)

    pathStr = dfPath.to_json(orient = 'values', indent = 4)

    pathObj = { 'MMSI' : MMSI, 'PathData' : json.loads(pathStr)}

    with open('./generated/path%d.json' % 0,'w') as file:
        json.dump(pathObj, file, indent=4)

def fitLSTM(trainX, trainY, testX, testY, epochs, neurons, batch_size):
    # design network
    model = Sequential()

    #jkl;sdj   kasdhjklg   fajkhsdf   jklasdhf   lkajsdh   fasdf

    model.add(LSTM(units=neurons, batch_input_shape=(batch_size, trainX.shape[1],trainX.shape[2]), return_sequences=True, stateful=True))
    model.add(Dense(6))
    model.compile(loss='mae', optimizer='adam')

    # fit network
    model.fit(trainX, trainY, epochs=epochs, validation_data=(testX, testY), verbose=2, shuffle=False)
    return model

# Function to clear any old json files from the output folder
def clearJsons():
    '''Deletes all JSON files in ./generated/ folder'''

    print('Clearning JSON files in generated file.')
    removed = 0
    for file in glob.glob('.\\generated\\*'):
        #for file in glob.glob('%s\\*.json' %folder):
        os.remove(file) 
        removed = removed + 1
    print('Removed: %d files.' % removed)

path = readData()

splitAt = int(len(path)*0.6)
trainX, testX = path[0:splitAt], path[splitAt:]
trainY = trainX.shift(-1, fill_value=0)
testY = testX.shift(-1, fill_value=0)

trainX = trainX.values
trainX = trainX.reshape(trainX.shape[0], 1, trainX.shape[1]) 

testX = testX.values
testX = testX.reshape(testX.shape[0], 1, testX.shape[1]) 

trainedModel = fitLSTM(trainX, trainY, testX, testY, epochs=20, neurons=64, batch_size = 1)
clearJsons()

startData = path.values.reshape(path.shape[0], 1, path.shape[1])
startData = np.array([startData[0]])

predicted = startData
predicted = np.append(predicted, trainedModel.predict(startData), axis=0)

for i in range(30):
    predicted = np.append(predicted, [trainedModel.predict(predicted)[-1]], axis=0)

outputPaths(predicted.reshape(predicted.shape[0], predicted.shape[2]))