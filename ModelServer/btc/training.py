import xgboost as xgb # type: ignore
import numpy as np
from sklearn.utils.class_weight import compute_sample_weight
from consts import training_files_btc

def train(ticker):
    X_train = np.load(f'{training_files_btc}/X_train_{ticker}.npy')
    y_train = np.load(f'{training_files_btc}/y_train_{ticker}.npy')

    X_train_flat = X_train.reshape(X_train.shape[0], -1)
    sample_weight = compute_sample_weight(class_weight='balanced', y=y_train)

  
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        n_estimators=500,
        max_depth=6,
        learning_rate=0.001,
        min_child_weight=50,
        gamma=5,
        reg_lambda=1,
        eval_metric=['logloss', 'error'],    
    )
    
    model.fit(
        X_train_flat,
        y_train,
        sample_weight=sample_weight,
    )

    import joblib
    joblib.dump(model, f'{training_files_btc}/model_{ticker}.pkl')

